using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Application;
using Contracts.Identity;
using Microsoft.AspNetCore.Http;

namespace BuildingBlocks.Api.Security;

public sealed class UserContext : IUserContext
{
    public string? UserId { get; private set; }
    public string? Email { get; private set; }
    public string? FullName { get; private set; }
    public UserRole Role { get; private set; }
    public Guid? GroupId { get; private set; }

    /// <summary>
    /// Создает UserContext из HttpContext (для HTTP запросов).
    /// </summary>
    public UserContext(IHttpContextAccessor httpContextAccessor)
    {
        var principal = httpContextAccessor.HttpContext?.User;
        if (principal?.Identity?.IsAuthenticated == true)
        {
            InitializeFromClaims(principal.Claims);
        }
    }

    /// <summary>
    /// Создает UserContext из JWT токена (для межсервисного взаимодействия).
    /// </summary>
    public UserContext(string jwtToken)
    {
        if (string.IsNullOrWhiteSpace(jwtToken))
            return;

        try
        {
            var handler = new JwtSecurityTokenHandler();
            var jsonToken = handler.ReadJwtToken(jwtToken);
            InitializeFromClaims(jsonToken.Claims);
        }
        catch
        {
            // Если токен невалидный или не удалось распарсить, оставляем значения по умолчанию
        }
    }

    /// <summary>
    /// Инициализирует UserContext из коллекции claims.
    /// </summary>
    private void InitializeFromClaims(IEnumerable<Claim> claims)
    {
        var claimsList = claims.ToList();

        // Verified claims (из Identity service middleware)
        UserId = FindClaimValue(claimsList, "user_id_verified", ClaimTypes.NameIdentifier, "sub");
        Email = FindClaimValue(claimsList, "email_verified", ClaimTypes.Email, "email");
        FullName = FindClaimValue(claimsList, "full_name_verified", ClaimTypes.Name, "name");

        // Role - с fallback на JWT claim
        var roleStr = FindClaimValue(claimsList, "role_verified", ClaimTypes.Role, "role");
        Role = string.IsNullOrWhiteSpace(roleStr)
            ? UserRole.Student
            : roleStr.ToLowerInvariant() switch
            {
                "admin" => UserRole.Admin,
                "teacher" => UserRole.Teacher,
                "student" => UserRole.Student,
                _ => UserRole.Student
            };

        // GroupId
        var groupIdStr = FindClaimValue(claimsList, "group_id_verified", "group_id", "groupId", "GroupId");
        GroupId = Guid.TryParse(groupIdStr, out var gid) ? gid : null;
    }

    /// <summary>
    /// Находит значение claim по приоритету типов.
    /// </summary>
    private static string? FindClaimValue(List<Claim> claims, params string[] claimTypes)
    {
        return claimTypes
            .Select(type => claims.FirstOrDefault(c => c.Type == type)?.Value)
            .FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));
    }
}