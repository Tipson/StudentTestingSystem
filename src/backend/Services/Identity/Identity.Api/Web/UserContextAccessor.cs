using System.Security.Claims;
using Contracts.Identity;
using Identity.Application.Interfaces;
using Identity.Domain.Users;
using UserRole = Contracts.Identity.UserRole;

namespace Identity.Api.Web;

public sealed class UserContextAccessor : IUserContext
{
    public string UserId { get; }
    public string? Email { get; }
    public string? FullName { get; }
    public UserRole Role { get; }

    public UserContextAccessor(IHttpContextAccessor http, IUserRepository users)
    {
        var ctx = http.HttpContext ?? throw new UnauthorizedAccessException("Контекст HTTP недоступен.");

        if (ctx.Items.TryGetValue("IUserContext", out var cached) && cached is UserContextCache cache)
        {
            UserId = cache.UserId;
            Email = cache.Email;
            FullName = cache.FullName;
            Role = cache.Role;
            return;
        }

        var principal = ctx.User;
        if (principal?.Identity?.IsAuthenticated != true)
            throw new UnauthorizedAccessException("Пользователь не аутентифицирован.");

        var userId =
            principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? principal.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(userId))
            throw new UnauthorizedAccessException("Не удалось определить идентификатор пользователя.");

        var email =
            principal.FindFirstValue(ClaimTypes.Email)
            ?? principal.FindFirstValue("email");

        var fullName =
            principal.FindFirstValue(ClaimTypes.Name)
            ?? principal.FindFirstValue("name")
            ?? principal.FindFirstValue("preferred_username");

        // Определяем роль из клеймов токена
        var roleFromClaims = GetRoleFromClaims(principal);

        var user = users.GetById(userId, ctx.RequestAborted).GetAwaiter().GetResult();
        if (user is null)
        {
            // Онбординг: создаём пользователя при первом запросе
            var newUser = new User(userId, email);
            if (!string.IsNullOrWhiteSpace(fullName)) newUser.SetFullName(fullName);
            newUser.SetRole(roleFromClaims ?? UserRole.Student);

            users.AddAsync(newUser, ctx.RequestAborted).GetAwaiter().GetResult();
            // Сохраняем изменения
            users.UpdateAsync(newUser, ctx.RequestAborted).GetAwaiter().GetResult();

            user = newUser;
        }
        else
        {
            // Синхронизируем профиль из токена
            var targetRole = roleFromClaims ?? user.Role;
            if (user.ApplyIdentity(email, fullName, targetRole))
            {
                users.UpdateAsync(user, ctx.RequestAborted).GetAwaiter().GetResult();
            }
        }

        UserId = userId;
        Email = email ?? user.Email;
        FullName = fullName ?? user.FullName;
        Role = roleFromClaims ?? user.Role;

        ctx.Items["IUserContext"] = new UserContextCache(UserId, Email, FullName, Role);
    }

    private static UserRole? GetRoleFromClaims(ClaimsPrincipal principal)
    {
        // Сначала смотрим явные клеймы роли
        var roleClaim = principal.FindFirst("role")?.Value
                        ?? principal.FindFirst(ClaimTypes.Role)?.Value;
        if (!string.IsNullOrWhiteSpace(roleClaim))
        {
            if (string.Equals(roleClaim, "admin", StringComparison.OrdinalIgnoreCase))
                return UserRole.Admin;
            if (string.Equals(roleClaim, "teacher", StringComparison.OrdinalIgnoreCase))
                return UserRole.Teacher;
            if (string.Equals(roleClaim, "student", StringComparison.OrdinalIgnoreCase))
                return UserRole.Student;
        }

        // В Keycloak роли realm хранятся в клейме realm_access.roles (JSON)
        var realmAccess = principal.FindFirst("realm_access")?.Value;
        if (!string.IsNullOrWhiteSpace(realmAccess))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(realmAccess);
                if (doc.RootElement.TryGetProperty("roles", out var rolesEl)
                    && rolesEl.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var r in rolesEl.EnumerateArray())
                    {
                        var v = r.GetString();
                        if (string.Equals(v, "admin", StringComparison.OrdinalIgnoreCase))
                            return UserRole.Admin;
                        if (string.Equals(v, "teacher", StringComparison.OrdinalIgnoreCase))
                            return UserRole.Teacher;
                        if (string.Equals(v, "student", StringComparison.OrdinalIgnoreCase))
                            return UserRole.Student;
                    }
                }
            }
            catch
            {
                // Игнорируем ошибки парсинга
            }
        }

        return null;
    }
}

internal sealed record UserContextCache(string UserId, string? Email, string? FullName, UserRole Role);
