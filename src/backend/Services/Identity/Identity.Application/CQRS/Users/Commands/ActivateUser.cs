using BuildingBlocks.Api.Exceptions;
using Identity.Application.Interfaces;
using MediatR;

namespace Identity.Application.CQRS.Users.Commands;

public sealed record ActivateUser(string UserId) : IRequest;

public sealed class ActivateUserHandler(IUserRepository users)
    : IRequestHandler<ActivateUser>
{
    public async Task Handle(ActivateUser request, CancellationToken ct)
    {
        var user = await users.GetById(request.UserId, ct)
                   ?? throw new EntityNotFoundException("Пользователь не найден.");
                   
        user.Activate();
        await users.UpdateAsync(user, ct);
    }
}
