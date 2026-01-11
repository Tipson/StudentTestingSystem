using BuildingBlocks.Api.Exceptions;
using Identity.Application.Interfaces;
using MediatR;

namespace Identity.Application.CQRS.Users.Commands;

public sealed record DeactivateUser(string UserId) : IRequest;

public sealed class DeactivateUserHandler(
    IUserRepository users,
    IUnitOfWork uow
) : IRequestHandler<DeactivateUser>
{
    public Task Handle(DeactivateUser request, CancellationToken ct) =>
        uow.ExecuteAsync(async innerCt =>
        {
            var user = await users.GetById(request.UserId, innerCt)
                       ?? throw new EntityNotFoundException("Пользователь не найден.");
            user.Deactivate();
            await users.UpdateAsync(user, innerCt);
        }, ct);
}

