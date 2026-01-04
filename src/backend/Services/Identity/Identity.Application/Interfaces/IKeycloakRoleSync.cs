using Contracts.Identity;
using Identity.Domain.Users;

namespace Identity.Application.Interfaces;

public interface IKeycloakRoleSync
{
    Task ReplaceRealmRoleAsync(string userId, UserRole role, CancellationToken ct);
}