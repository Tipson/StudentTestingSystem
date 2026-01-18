using Application;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Commands;

/// <summary>
/// Отозвать доступ к тесту.
/// </summary>
public sealed record RevokeAccess(Guid AccessId) : IRequest;

public sealed class RevokeAccessHandler(
    IUserContext userContext,
    ITestRepository tests,
    ITestAccessRepository testAccesses)
    : IRequestHandler<RevokeAccess>
{
    public async Task Handle(RevokeAccess request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var access = await testAccesses.GetByIdAsync(request.AccessId, ct)
                     ?? throw new EntityNotFoundException("Доступ не найден.");

        var test = await tests.GetByIdAsync(access.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Только владелец теста может отзывать доступ.");

        access.Revoke();
        await testAccesses.UpdateAsync(access, ct);
    }
}