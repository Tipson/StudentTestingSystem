using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using Identity.Application.Interfaces;
using MediatR;

namespace Identity.Application.CQRS.Users.Commands;

public sealed record SetUserRole(string UserId, UserRole Role) : IRequest;

public sealed class SetUserRoleHandler(
    IUserRepository users,
    IUnitOfWork uow,
    IKeycloakService keycloak
) : IRequestHandler<SetUserRole>
{
    public async Task Handle(SetUserRole request, CancellationToken ct)
    {
        // Меняем роль в Keycloak (истина)
        await keycloak.SetUserRealmRoleAsync(request.UserId, request.Role, ct);

        // Обновляем БД (проекция)
        await uow.ExecuteAsync(async innerCt =>
        {
            var user = await users.GetById(request.UserId, innerCt)
                       ?? throw new EntityNotFoundException("Пользователь не найден.");

            if (user.Role == request.Role)
                return;

            user.SetRole(request.Role);
            await users.UpdateAsync(user, innerCt);
        }, ct);
    }
}