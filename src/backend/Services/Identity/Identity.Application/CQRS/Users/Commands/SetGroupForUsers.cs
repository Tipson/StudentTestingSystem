using Application;
using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using Identity.Application.Interfaces;
using MediatR;

namespace Identity.Application.CQRS.Users.Commands;

public sealed record SetGroupForUsers(List<string> UserIds, Guid? GroupId) : IRequest;

public sealed class SetGroupForUsersHandler(
    IUnitOfWork unitOfWork,
    IUserRepository users,
    IGroupRepository groups)
    : IRequestHandler<SetGroupForUsers>
{
    public async Task Handle(SetGroupForUsers request, CancellationToken ct)
    {
        await unitOfWork.ExecuteAsync(async (cancellationToken) =>
        {
            if (request.GroupId.HasValue)
            {
                var group = await groups.GetById(request.GroupId.Value, cancellationToken)
                            ?? throw new EntityNotFoundException("Группа не найдена.");

                if (!group.IsActive)
                    throw new InvalidOperationException("Невозможно добавить студентов в неактивную группу.");
            }

            foreach (var userId in request.UserIds)
            {
                var user = await users.GetById(userId, cancellationToken);

                if (user is null)
                    throw new EntityNotFoundException($"Пользователь с ID {userId} не найден.");

                if (user.Role != UserRole.Student)
                    throw new InvalidOperationException($"Пользователь {userId} не является студентом.");

                if (user.GroupId == request.GroupId)
                    continue;

                user.SetGroupId(request.GroupId);
                await users.UpdateAsync(user, cancellationToken);
            }
        }, ct);
    }
}
