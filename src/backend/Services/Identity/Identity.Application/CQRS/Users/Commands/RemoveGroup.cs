using Application;
using Identity.Application.Interfaces;
using MediatR;

namespace Identity.Application.CQRS.Users.Commands;

public sealed record RemoveGroup : IRequest;

public sealed class RemoveGroupHandler(
    IUserRepository users,
    IUserContext userContext
) : IRequestHandler<RemoveGroup>
{
    public async Task Handle(RemoveGroup request, CancellationToken ct)
    {
        var userId = userContext.UserId;

        var user = await users.GetById(userId, ct)
                   ?? throw new InvalidOperationException("Пользователь не найден");

        if (user.GroupId is null)
            return;

        user.SetGroupId(null);
        await users.UpdateAsync(user, ct);
    }
}