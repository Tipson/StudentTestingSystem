using System.Security.Claims;
using Application;
using Contracts.Identity;
using Microsoft.AspNetCore.Http;

namespace BuildingBlocks.Api.Security;

public sealed class UserContext : IUserContext
{
    public string UserId { get; }
    public string? Email { get; }
    public string? FullName { get; }
    public UserRole Role { get; }
    public Guid? GroupId { get; }

    public UserContext(IHttpContextAccessor httpContextAccessor)
    {
        var context = httpContextAccessor.HttpContext
                      ?? throw new InvalidOperationException("HTTP context недоступен");

        var principal = context.User;
        if (principal.Identity?.IsAuthenticated != true)
            throw new UnauthorizedAccessException("Пользователь не аутентифицирован");

        // Verified claims (из Identity service middleware)
        UserId = principal.FindFirstValue("user_id_verified")
                 ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? principal.FindFirstValue("sub")
                 ?? throw new UnauthorizedAccessException("UserId не найден");

        Email = principal.FindFirstValue("email_verified")
                ?? principal.FindFirstValue(ClaimTypes.Email)
                ?? principal.FindFirstValue("email");

        FullName = principal.FindFirstValue("full_name_verified")
                   ?? principal.FindFirstValue(ClaimTypes.Name)
                   ?? principal.FindFirstValue("name");

        // Role - с fallback на JWT claim
        var roleStr = principal.FindFirstValue("role_verified")
                      ?? principal.FindFirstValue(ClaimTypes.Role)
                      ?? principal.FindFirstValue("role");

        Role = ParseRole(roleStr);

        // GroupId
        var groupIdStr = principal.FindFirstValue("group_id_verified")
                         ?? principal.FindFirstValue("group_id")
                         ?? principal.FindFirstValue("groupId")
                         ?? principal.FindFirstValue("GroupId");

        GroupId = Guid.TryParse(groupIdStr, out var gid) ? gid : null;
    }

    private static UserRole ParseRole(string? roleStr)
    {
        if (string.IsNullOrWhiteSpace(roleStr))
            return UserRole.Student;

        return roleStr.ToLowerInvariant() switch
        {
            "admin" => UserRole.Admin,
            "teacher" => UserRole.Teacher,
            "student" => UserRole.Student,
            _ => UserRole.Student
        };
    }
}