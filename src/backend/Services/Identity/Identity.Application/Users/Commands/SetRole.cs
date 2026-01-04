using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using Identity.Application.Interfaces;
using Identity.Domain.Users;
using MediatR;

namespace Identity.Application.Users.Commands;

public sealed record SetUserRole(string UserId, UserRole Role) : IRequest;

public sealed class SetUserRoleHandler(
    IUserRepository users,
    IKeycloakRoleSync keycloak,
    IUnitOfWork uow
) : IRequestHandler<SetUserRole>
{
    public Task Handle(SetUserRole request, CancellationToken ct) =>
        uow.ExecuteAsync(async innerCt =>
    {
        var user = await users.GetById(request.UserId, innerCt)
                   ?? throw new EntityNotFoundException("Пользователь не найден.");

        if (user.Role == request.Role)
            return;

        user.SetRole(request.Role);

        await users.UpdateAsync(user, innerCt);

        await keycloak.ReplaceRealmRoleAsync(request.UserId, request.Role, innerCt);

    }, ct);
}

