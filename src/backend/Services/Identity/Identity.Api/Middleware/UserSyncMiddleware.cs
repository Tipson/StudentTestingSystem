using System.Security.Claims;
using System.Text.Json;
using Contracts.Identity;
using Identity.Application.Interfaces;
using Identity.Domain.Users;
using Microsoft.Extensions.Caching.Distributed;

namespace Identity.Api.Middleware;

public sealed class UserSyncMiddleware(
    RequestDelegate next)
{
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

        // Кеш не хранит User. Только флаг "created/known"
        var cacheKey = $"user_known:{userId}";

        // Всегда читаем из БД, чтобы GroupId и Role были актуальными
        var user = await users.GetById(userId, context.RequestAborted);

        // UserSyncMiddleware.cs — добавить после получения user
        if (user is not null && !user.IsActive)
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new 
            { 
                Message = "Аккаунт деактивирован", 
                ErrorCode = "USER_DEACTIVATED" 
            });
            return;
        }
        
        if (user is null)
        {
            user = await CreateOrGetUserFromClaimsAsync(context, users, userId, context.RequestAborted);
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

        if (true)
        {
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

    private async Task<User> CreateOrGetUserFromClaimsAsync(
        HttpContext context,
        IUserRepository users,
        string userId,
        CancellationToken ct)
    {
        var email = context.User.FindFirstValue(ClaimTypes.Email)
                    ?? context.User.FindFirstValue("email");
    
        var fullName = context.User.FindFirstValue(ClaimTypes.Name)
                       ?? context.User.FindFirstValue("name")
                       ?? context.User.FindFirstValue("preferred_username");
    
        var role = GetRoleFromClaims(context.User) ?? UserRole.Student;
    
        var candidate = new User(userId, email);
    
        if (!string.IsNullOrWhiteSpace(fullName))
            candidate.SetFullName(fullName);
    
        candidate.SetRole(role);
    
        // Решает race condition
        return await users.GetOrCreateAsync(candidate, ct);
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
