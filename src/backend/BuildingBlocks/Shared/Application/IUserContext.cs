using Contracts.Identity;

namespace Application;

public interface IUserContext
{
    string? UserId { get; }
    string? Email { get; }
    string? FullName { get; }
    UserRole Role { get; }
    Guid? GroupId { get; }
    /// <summary>Значение заголовка Authorization (Bearer ...) для пересылки во внутренние сервисы.</summary>
    string? BearerToken { get; }
}