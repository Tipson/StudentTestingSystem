namespace Identity.Application.Interfaces;

public interface IKeycloakUserService
{
    Task SetUserGroupAsync(string userId, Guid groupId, CancellationToken ct = default);
    Task RemoveUserGroupAsync(string userId, CancellationToken ct = default);
    Task<Guid?> GetUserGroupAsync(string userId, CancellationToken ct = default);
}