using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using Identity.Application.Interfaces;
using MediatR;

namespace Identity.Application.CQRS.Users.Commands;

/// <summary>
/// Массово изменить группу у студентов (или открепить от группы).
/// </summary>
public sealed record SetGroupForUsers(List<string> UserIds, Guid? GroupId) : IRequest;

public sealed class SetGroupForUsersHandler(
    IUserRepository users,
    IGroupRepository groups)
    : IRequestHandler<SetGroupForUsers>
{
    public async Task Handle(SetGroupForUsers request, CancellationToken ct)
    {
        // Если устанавливается группа, проверяем что она существует и активна
        if (request.GroupId.HasValue)
        {
            var group = await groups.GetById(request.GroupId.Value, ct)
                        ?? throw new EntityNotFoundException("Группа не найдена.");

            if (!group.IsActive)
                throw new InvalidOperationException("Невозможно добавить студентов в неактивную группу.");
        }

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
