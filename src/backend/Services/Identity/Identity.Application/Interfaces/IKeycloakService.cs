using Contracts.Identity;

namespace Identity.Application.Interfaces;

public interface IKeycloakService
{
    Task SetUserRealmRoleAsync(string userId, UserRole role, CancellationToken ct);
}