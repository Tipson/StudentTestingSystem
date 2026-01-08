using Identity.Application.Interfaces;
using Identity.Domain.Users;
using System.Security.Claims;
using System.Text.Json;
using Contracts.Identity;
using Microsoft.Extensions.Caching.Distributed;

namespace Identity.Api.Middleware;

public sealed class UserSyncMiddleware(RequestDelegate next,
    IDistributedCache cache,
    IKeycloakRoleSync keycloak)
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
        
        if (cachedData is not null)
        {
            var cachedUser = JsonSerializer.Deserialize<User>(cachedData);
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
            newUser.SetRole(role ?? UserRole.Student);
            
            await users.AddAsync(newUser, context.RequestAborted);
            
            try
            {
                await keycloak.ReplaceRealmRoleAsync(userId, assignedRole, context.RequestAborted);
            }
            catch (Exception ex)
            {
                // Игнорируем ошибки синхронизации с Keycloak
                // Пользователь всё равно будет создан в БД
                // Роль можно будет синхронизировать позже через SetUserRole
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

        var serialized = JsonSerializer.Serialize(user);
        await cache.SetStringAsync(cacheKey, serialized, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = CacheDuration
        }, context.RequestAborted);

        // Сохраняем данные в Items для быстрого доступа
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
            using var doc = System.Text.Json.JsonDocument.Parse(realmAccess);
            if (!doc.RootElement.TryGetProperty("roles", out var rolesEl) ||
                rolesEl.ValueKind != System.Text.Json.JsonValueKind.Array)
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
            // Игнорируем ошибки парсинга
        }

        return null;
    }
}