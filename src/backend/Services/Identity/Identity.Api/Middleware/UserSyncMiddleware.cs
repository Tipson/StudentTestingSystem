using System.Security.Claims;
using System.Text.Json;
using Contracts.Identity;
using Identity.Application.Interfaces;
using Identity.Domain.Users;
using Microsoft.Extensions.Caching.Distributed;

namespace Identity.Api.Middleware;

public sealed class UserSyncMiddleware(
    RequestDelegate next,
    IDistributedCache cache,
    IKeycloakRoleSync roleSync,
    IKeycloakUserService keycloakUserService)
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);

    public async Task InvokeAsync(HttpContext context, IUserRepository users)
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

        User? user;

        if (cachedData is not null)
        {
            user = JsonSerializer.Deserialize<User>(cachedData);
        }
        else
        {
            user = await SyncUserAsync(context, users, userId);
            
            if (user is not null)
            {
                var serialized = JsonSerializer.Serialize(user);
                await cache.SetStringAsync(cacheKey, serialized, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = CacheDuration
                }, context.RequestAborted);
            }
        }

        if (user is not null)
        {
            // Добавляем enriched claims для других middleware/контроллеров
            var identity = new ClaimsIdentity();
            
            identity.AddClaim(new Claim("user_id_verified", user.Id));
            
            if (user.Email is not null)
                identity.AddClaim(new Claim("email_verified", user.Email));       
            
            if (user.FullName is not null)
                identity.AddClaim(new Claim("full_name_verified", user.FullName));
            
            identity.AddClaim(new Claim("role_verified", user.Role.ToString()));
            
            if (user.GroupId.HasValue)
                identity.AddClaim(new Claim("group_id_verified", user.GroupId.Value.ToString()));

            context.User.AddIdentity(identity);
            context.Items["SyncedUser"] = user;
        }

        await next(context);
    }

private async Task<User?> SyncUserAsync(HttpContext context, IUserRepository users, string userId)
    {
        var user = await users.GetById(userId, context.RequestAborted);

        if (user is null)
        {
            // Создание нового пользователя
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

            // GroupId для новых пользователей можно взять из claims
            var groupIdFromClaims = GetGroupIdFromClaims(context.User);
            if (groupIdFromClaims.HasValue)
                newUser.SetGroupId(groupIdFromClaims);

            await users.AddAsync(newUser, context.RequestAborted);

            try
            {
                await roleSync.ReplaceRealmRoleAsync(userId, assignedRole, context.RequestAborted);
            }
            catch
            {
                // ignore
            }

            user = newUser;
        }
        else
        {
            // Синхронизация существующего пользователя
            var email = context.User.FindFirstValue(ClaimTypes.Email)
                        ?? context.User.FindFirstValue("email");

            var fullName = context.User.FindFirstValue(ClaimTypes.Name)
                           ?? context.User.FindFirstValue("name");

            var role = GetRoleFromClaims(context.User) ?? user.Role;

            if (user.ApplyIdentity(email, fullName, role))
            {
                await users.UpdateAsync(user, context.RequestAborted);
            }

            // GroupId: БД - источник правды, но синхронизируем с Keycloak при расхождении
            var groupIdFromClaims = GetGroupIdFromClaims(context.User);
            
            // Если в claims есть значение, отличное от БД - обновляем БД
            // (это может быть если студент выбрал группу в другом сервисе)
            if (groupIdFromClaims.HasValue && user.GroupId != groupIdFromClaims)
            {
                user.SetGroupId(groupIdFromClaims);
                await users.UpdateAsync(user, context.RequestAborted);
            }
            
            // Обратная синхронизация: если в БД есть GroupId, но в Keycloak устарело
            else if (user.GroupId.HasValue && user.GroupId != groupIdFromClaims)
            {
                try
                {
                    await keycloakUserService.SetUserGroupAsync(
                        userId, 
                        user.GroupId.Value, 
                        context.RequestAborted);
                }
                catch
                {
                    // ignore
                }
            }
        }

        return user;
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

    private static Guid? GetGroupIdFromClaims(ClaimsPrincipal principal)
    {
        var groupClaim = principal.FindFirstValue("group_id")
                         ?? principal.FindFirstValue("groupId")
                         ?? principal.FindFirstValue("GroupId");

        return Guid.TryParse(groupClaim, out var gid) ? gid : null;
    }
}
