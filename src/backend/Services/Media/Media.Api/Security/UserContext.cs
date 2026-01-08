using System.Security.Claims;
using Application;
using Contracts.Identity;

namespace Media.Api.Security;

public sealed class UserContext(IHttpContextAccessor http) : IUserContext
{
    private readonly ClaimsPrincipal _user = http.HttpContext?.User
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
    
    public Guid? GroupId
    {
        get
        {
            var raw = _user.FindFirst("group_id")?.Value
                      ?? _user.FindFirst("groupId")?.Value
                      ?? _user.FindFirst("GroupId")?.Value;

            return Guid.TryParse(raw, out var gid) ? gid : null;
        }
    }

    public UserRole Role => UserRole.Student;
}