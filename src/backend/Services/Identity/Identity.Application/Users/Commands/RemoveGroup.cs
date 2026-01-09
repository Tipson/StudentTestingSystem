using Application;
using Identity.Application.Interfaces;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;

namespace Identity.Application.Users.Commands;

public sealed record RemoveGroup : IRequest;

public sealed class RemoveGroupHandler(
    IDistributedCache cache,
    IKeycloakUserService keycloak,
    IUserRepository users,
    IUserContext userContext)
    : IRequestHandler<RemoveGroup>
{
    public async Task Handle(RemoveGroup request, CancellationToken ct)
    {
        var userId = userContext.UserId;
        
        var user = await users.GetById(userId, ct)
                   ?? throw new InvalidOperationException("Пользователь не найден");

        user.SetGroupId(null);
        await users.UpdateAsync(user, ct);

        try
        {
            await keycloak.RemoveUserGroupAsync(userId, ct);
        }
        catch
        {
            // ignore
        }

        await cache.RemoveAsync($"user_synced:{userId}", ct);
        await cache.RemoveAsync($"user_claims:{userId}", ct);
    }
}
