using Application;
using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using Identity.Application.Interfaces;
using MediatR;

namespace Identity.Application.CQRS.Groups.Commands;

public sealed record AddStudentsToGroup(Guid GroupId, List<string> UserIds) : IRequest;

public sealed class AddStudentsToGroupHandler(
    IUnitOfWork unitOfWork,
    IGroupRepository groups,
    IUserRepository users)
    : IRequestHandler<AddStudentsToGroup>
{
    public async Task Handle(AddStudentsToGroup request, CancellationToken ct)
    {
        await unitOfWork.ExecuteAsync(async (cancellationToken) =>
        {
            var group = await groups.GetById(request.GroupId, cancellationToken)
                        ?? throw new EntityNotFoundException("Группа не найдена.");

            if (!group.IsActive)
                throw new InvalidOperationException("Невозможно добавить студентов в неактивную группу.");

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
