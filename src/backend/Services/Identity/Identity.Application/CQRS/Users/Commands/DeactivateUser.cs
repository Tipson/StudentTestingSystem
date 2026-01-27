using BuildingBlocks.Api.Exceptions;
using Identity.Application.Interfaces;
using MediatR;

namespace Identity.Application.CQRS.Users.Commands;

public sealed record DeactivateUser(string UserId) : IRequest;

public sealed class DeactivateUserHandler(IUserRepository users)
    : IRequestHandler<DeactivateUser>
{
    public async Task Handle(DeactivateUser request, CancellationToken ct)
    {
        var user = await users.GetById(request.UserId, ct)
                   ?? throw new EntityNotFoundException("Пользователь не найден.");
                   
        user.Deactivate();
        await users.UpdateAsync(user, ct);
    }
}
