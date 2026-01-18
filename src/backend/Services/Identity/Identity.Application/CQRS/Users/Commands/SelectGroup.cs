using Application;
using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using Identity.Application.Interfaces;
using MediatR;

namespace Identity.Application.CQRS.Users.Commands;

public sealed record SelectGroup(Guid GroupId) : IRequest;

public sealed class SelectGroupHandler(
    IUserContext userContext,
    IUserRepository users,
    IGroupRepository groups
) : IRequestHandler<SelectGroup>
{
    public async Task Handle(SelectGroup request, CancellationToken ct)
    {
        var userId = userContext.UserId;

        var user = await users.GetById(userId, ct)
                   ?? throw new EntityNotFoundException("Пользователь не найден");

        var group = await groups.GetById(request.GroupId, ct)
                    ?? throw new EntityNotFoundException("Группа не найдена");

        if (!group.IsActive)
            throw new InvalidOperationException("Группа неактивна");

        if (user.Role != UserRole.Student)
            throw new InvalidOperationException("Только студенты могут выбирать группу");

        if (user.GroupId == request.GroupId)
            return;

        user.SetGroupId(request.GroupId);
        await users.UpdateAsync(user, ct);
    }
}