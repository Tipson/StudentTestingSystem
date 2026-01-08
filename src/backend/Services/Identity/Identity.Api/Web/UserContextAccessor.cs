using System.Security.Claims;
using Application;
using Contracts.Identity;
using Identity.Domain.Users;

namespace Identity.Api.Web;

public sealed class UserContextAccessor : IUserContext
{
    public string UserId { get; }
    public string? Email { get; }
    public string? FullName { get; }
    public UserRole Role { get; }

    public UserContextAccessor(IHttpContextAccessor http)
    {
        var ctx = http.HttpContext 
                  ?? throw new InvalidOperationException("HTTP context unavailable");

        var principal = ctx.User;
        if (principal.Identity?.IsAuthenticated != true)
            throw new UnauthorizedAccessException("User not authenticated");

        // Получаем из middleware (уже синхронизировано с БД)
        if (ctx.Items.TryGetValue("SyncedUser", out var cached) && cached is User user)
        {
            UserId = user.Id;
            Email = user.Email;
            FullName = user.FullName;
            Role = user.Role;
            return;
        }

        // Fallback на claims (если middleware не отработал)
        UserId = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? principal.FindFirstValue("sub")
                 ?? throw new UnauthorizedAccessException("User ID not found");

        Email = principal.FindFirstValue(ClaimTypes.Email)
                ?? principal.FindFirstValue("email");

        FullName = principal.FindFirstValue(ClaimTypes.Name)
                   ?? principal.FindFirstValue("name");

        Role = GetRoleFromClaims(principal);
    }

    private static UserRole GetRoleFromClaims(ClaimsPrincipal principal)
    {
        var roleClaim = principal.FindFirstValue(ClaimTypes.Role)
                        ?? principal.FindFirstValue("role");

        return roleClaim?.ToLowerInvariant() switch
        {
            "admin" => UserRole.Admin,
            "teacher" => UserRole.Teacher,
            _ => UserRole.Student
        };
    }
}