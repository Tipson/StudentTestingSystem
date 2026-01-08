using System.Security.Claims;
using Application;
using Contracts.Identity;
using Microsoft.AspNetCore.Http;

namespace Assessment.Application.Services;

public class UserContext(IHttpContextAccessor httpContextAccessor) : IUserContext
{
    private readonly ClaimsPrincipal _user = httpContextAccessor.HttpContext?.User 
                                             ?? throw new UnauthorizedAccessException("Пользователь не аутентифицирован");

    public string UserId => 
        _user.FindFirst(ClaimTypes.NameIdentifier)?.Value 
        ?? _user.FindFirst("sub")?.Value 
        ?? throw new UnauthorizedAccessException("UserId не найден");

    public string? Email => 
        _user.FindFirst(ClaimTypes.Email)?.Value 
        ?? _user.FindFirst("email")?.Value;

    public string? FullName => 
        _user.FindFirst(ClaimTypes.Name)?.Value 
        ?? _user.FindFirst("name")?.Value;

    public UserRole Role
    {
        get
        {
            var roleClaim = _user.FindFirst(ClaimTypes.Role)?.Value 
                            ?? _user.FindFirst("role")?.Value;

            return roleClaim?.ToLower() switch
            {
                "admin" => UserRole.Admin,
                "teacher" => UserRole.Teacher,
                "student" => UserRole.Student,
                _ => UserRole.Student // default
            };
        }
    }
    
    public Guid? GroupId // ⭐ ДОБАВИТЬ
    {
        get
        {
            var groupClaim = httpContextAccessor.HttpContext?.User.FindFirstValue("group_id");
            return Guid.TryParse(groupClaim, out var groupId) ? groupId : null;
        }
    }

}