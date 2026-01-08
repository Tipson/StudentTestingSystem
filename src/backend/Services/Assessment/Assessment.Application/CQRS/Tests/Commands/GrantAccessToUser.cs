using Application;
using Assessment.Application.Interfaces;
using Assessment.Domain.Tests;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Commands;

/// <summary>
/// Выдать доступ к тесту конкретному пользователю.
/// </summary>
public sealed record GrantAccessToUser(
    Guid TestId,
    string TargetUserId,
    DateTimeOffset? ExpiresAt = null
) : IRequest<Guid>;

public sealed class GrantAccessToUserHandler(
    IUserContext userContext,
    ITestRepository tests,
    ITestAccessRepository testAccesses)
    : IRequestHandler<GrantAccessToUser, Guid>
{
    public async Task<Guid> Handle(GrantAccessToUser request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Только владелец теста может выдавать доступ.");

        // Проверяем дубликаты
        var existing = await testAccesses.GetByTestAndUserAsync(request.TestId, request.TargetUserId, ct);
        if (existing is not null && existing.CanBeUsed())
            throw new BadRequestApiException("Этот пользователь уже имеет доступ к тесту.");

        var access = TestAccess.ForUser(
            request.TestId,
            request.TargetUserId,
            userId,
            request.ExpiresAt
        );

        await testAccesses.AddAsync(access, ct);

        return access.Id;
    }
}