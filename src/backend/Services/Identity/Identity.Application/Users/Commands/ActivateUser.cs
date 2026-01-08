using BuildingBlocks.Api.Exceptions;
using Identity.Application.Interfaces;
using MediatR;

namespace Identity.Application.Users.Commands;

public sealed record ActivateUser(string UserId) : IRequest;

public sealed class ActivateUserHandler(
    IUserRepository users,
    IUnitOfWork uow
) : IRequestHandler<ActivateUser>
{
    public Task Handle(ActivateUser request, CancellationToken ct) =>
        uow.ExecuteAsync(async innerCt =>
        {
            var user = await users.GetById(request.UserId, innerCt)
                       ?? throw new EntityNotFoundException("Пользователь не найден.");
            user.Activate();
            await users.UpdateAsync(user, innerCt);
        }, ct);
}

