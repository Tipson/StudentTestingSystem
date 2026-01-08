using Contracts.Identity;

namespace Application;

public interface IUserContext
{
    string UserId { get; }
    string? Email { get; }
    string? FullName { get; }
    UserRole Role { get; }
}