using Application;
using Assessment.Application.Interfaces;
using Assessment.Domain.Tests;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Identity;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Commands;

/// <summary>
/// Выдать доступ к тесту всей группе.
/// </summary>
public sealed record GrantAccessToGroup(
    Guid TestId,
    Guid GroupId,
    DateTimeOffset? ExpiresAt = null
) : IRequest<Guid>;

public sealed class GrantAccessToGroupHandler(
    IUserContext userContext,
    ITestRepository tests,
    ITestAccessRepository testAccesses)
    : IRequestHandler<GrantAccessToGroup, Guid>
{
    public async Task<Guid> Handle(GrantAccessToGroup request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Только владелец теста может выдавать доступ.");

        // Проверяем дубликаты
        var existing = await testAccesses.GetByTestAndGroupAsync(request.TestId, request.GroupId, ct);
        if (existing is not null && existing.CanBeUsed())
            throw new BadRequestApiException("Эта группа уже имеет доступ к тесту.");

        var access = TestAccess.ForGroup(
            request.TestId,
            request.GroupId,
            userId,
            request.ExpiresAt
        );

        await testAccesses.AddAsync(access, ct);

        return access.Id;
    }
}