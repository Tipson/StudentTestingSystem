using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using Identity.Application.Interfaces;
using MediatR;

namespace Identity.Application.CQRS.Groups.Commands;

/// <summary>
/// Массово добавить студентов в группу.
/// </summary>
public sealed record AddStudentsToGroup(Guid GroupId, List<string> UserIds) : IRequest;

public sealed class AddStudentsToGroupHandler(
    IGroupRepository groups,
    IUserRepository users)
    : IRequestHandler<AddStudentsToGroup>
{
    public async Task Handle(AddStudentsToGroup request, CancellationToken ct)
    {
        // Проверяем что группа существует и активна
        var group = await groups.GetById(request.GroupId, ct)
                    ?? throw new EntityNotFoundException("Группа не найдена.");

        if (!group.IsActive)
            throw new InvalidOperationException("Невозможно добавить студентов в неактивную группу.");

        // Загружаем и обновляем каждого пользователя
        foreach (var userId in request.UserIds)
        {
            var user = await users.GetById(userId, ct);
            
            if (user is null)
                throw new EntityNotFoundException($"Пользователь с ID {userId} не найден.");

            if (user.Role != UserRole.Student)
                throw new InvalidOperationException($"Пользователь {userId} не является студентом.");

            // Уже в этой группе - пропускаем
            if (user.GroupId == request.GroupId)
                continue;

            user.SetGroupId(request.GroupId);
            await users.UpdateAsync(user, ct);
        }
    }
}
