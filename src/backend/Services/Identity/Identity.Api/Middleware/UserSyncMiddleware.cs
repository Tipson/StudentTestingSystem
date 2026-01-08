using Identity.Application.Interfaces;
using Identity.Domain.Users;
using Identity.Domain.Groups;
using System.Security.Claims;
using System.Text.Json;
using Contracts.Identity;
using Identity.Infrastructure.Data;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.EntityFrameworkCore;

namespace Identity.Api.Middleware;

public sealed class UserSyncMiddleware(
    RequestDelegate next,
    IDistributedCache cache,
    IKeycloakRoleSync keycloak)
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);

    // ДОБАВИЛИ IdentityDbContext db (замени на своё имя DbContext)
    public async Task InvokeAsync(HttpContext context, IUserRepository users, IdentityDbContext db)
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            await next(context);
            return;
        }

        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? context.User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(userId))
        {
            await next(context);
            return;
        }

        var cacheKey = $"user_synced:{userId}";
        var cachedData = await cache.GetStringAsync(cacheKey, context.RequestAborted);

        if (cachedData is not null)
        {
            var cachedUser = JsonSerializer.Deserialize<User>(cachedData);

            // На всякий: если вдруг десериализация не удалась
            if (cachedUser is not null)
                context.Items["SyncedUser"] = cachedUser;

            await next(context);
            return;
        }

        var user = await users.GetById(userId, context.RequestAborted);

        if (user is null)
        {
            var email = context.User.FindFirstValue(ClaimTypes.Email)
                        ?? context.User.FindFirstValue("email");

            var fullName = context.User.FindFirstValue(ClaimTypes.Name)
                           ?? context.User.FindFirstValue("name")
                           ?? context.User.FindFirstValue("preferred_username");

            var role = GetRoleFromClaims(context.User);

            var newUser = new User(userId, email);

            if (!string.IsNullOrWhiteSpace(fullName))
                newUser.SetFullName(fullName);

            var assignedRole = role ?? UserRole.Student;
            newUser.SetRole(assignedRole);

            await users.AddAsync(newUser, context.RequestAborted);

            try
            {
                await keycloak.ReplaceRealmRoleAsync(userId, assignedRole, context.RequestAborted);
            }
            catch
            {
                // ignore
            }

            user = newUser;
        }
        else
        {
            var email = context.User.FindFirstValue(ClaimTypes.Email)
                        ?? context.User.FindFirstValue("email");

            var fullName = context.User.FindFirstValue(ClaimTypes.Name)
                           ?? context.User.FindFirstValue("name");

            var role = GetRoleFromClaims(context.User) ?? user.Role;

            if (user.ApplyIdentity(email, fullName, role))
            {
                await users.UpdateAsync(user, context.RequestAborted);
            }
        }

        // === ВОТ ГЛАВНОЕ: GroupId из БД через GroupMembers ===
        var groupIdFromDb = await db.Set<GroupMember>()
            .Where(x => x.UserId == userId)
            .Select(x => (Guid?)x.GroupId)
            .FirstOrDefaultAsync(context.RequestAborted);

        // проставляем в user и сохраняем (чтобы ушло в кеш и дальше читалось из SyncedUser)
        if (user.GroupId != groupIdFromDb)
        {
            user.SetGroupId(groupIdFromDb);
            await users.UpdateAsync(user, context.RequestAborted);
        }

        var serialized = JsonSerializer.Serialize(user);
        await cache.SetStringAsync(cacheKey, serialized, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = CacheDuration
        }, context.RequestAborted);

        context.Items["SyncedUser"] = user;

        await next(context);
    }

    private static UserRole? GetRoleFromClaims(ClaimsPrincipal principal)
    {
        var roleClaim = principal.FindFirstValue("role")
                        ?? principal.FindFirstValue(ClaimTypes.Role);

        if (!string.IsNullOrWhiteSpace(roleClaim))
        {
            return roleClaim.ToLowerInvariant() switch
            {
                "admin" => UserRole.Admin,
                "teacher" => UserRole.Teacher,
                "student" => UserRole.Student,
                _ => null
            };
        }

        var realmAccess = principal.FindFirstValue("realm_access");
        if (string.IsNullOrWhiteSpace(realmAccess))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(realmAccess);
            if (!doc.RootElement.TryGetProperty("roles", out var rolesEl) ||
                rolesEl.ValueKind != JsonValueKind.Array)
                return null;

            foreach (var r in rolesEl.EnumerateArray())
            {
                var v = r.GetString()?.ToLowerInvariant();
                return v switch
                {
                    "admin" => UserRole.Admin,
                    "teacher" => UserRole.Teacher,
                    "student" => UserRole.Student,
                    _ => null
                };
            }
        }
        catch
        {
            // ignored
        }

        return null;
    }
}
