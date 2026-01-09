using Application;
using Contracts.Identity;
using Identity.Application.Interfaces;
using Identity.Domain;
using Identity.Domain.Groups;
using Identity.Domain.Users;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;

namespace Identity.Application.Users.Commands;

public sealed record SelectGroup(Guid GroupId) : IRequest;

public sealed class SelectGroupHandler(
    IUserContext userContext,
    IUserRepository users,
    IGroupRepository groups,
    IKeycloakUserService keycloak,
    IDistributedCache cache)
    : IRequestHandler<SelectGroup>
{
    public async Task Handle(SelectGroup request, CancellationToken ct)
    {
        var userId = userContext.UserId;
        
        var user = await users.GetById(userId, ct)
            ?? throw new InvalidOperationException("Пользователь не найден");

        // Проверяем что группа существует и активна
        var group = await groups.GetById(request.GroupId, ct)
            ?? throw new InvalidOperationException("Группа не найдена");

        if (!group.IsActive)
            throw new InvalidOperationException("Группа неактивна");

        // Студенты могут выбирать группу сами
        // Преподаватели/админы - нет (или через другой API)
        if (user.Role != UserRole.Student)
            throw new InvalidOperationException("Только студенты могут выбирать группу");

        user.SetGroupId(request.GroupId);
        await users.UpdateAsync(user, ct);

        // Синхронизируем с Keycloak (для обновления claims в следующем токене)
        try
        {
            await keycloak.SetUserGroupAsync(userId, request.GroupId, ct);
        }
        catch
        {
            // Логируем, но не падаем
        }

        // Инвалидируем кеш
        await cache.RemoveAsync($"user_synced:{userId}", ct);
        await cache.RemoveAsync($"user_claims:{userId}", ct);
    }
}
