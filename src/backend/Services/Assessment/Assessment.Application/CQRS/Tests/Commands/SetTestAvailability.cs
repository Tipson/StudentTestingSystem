using Application;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Commands;

/// <summary>
/// Устанавливает временные рамки доступности теста (AvailableFrom/Until).
/// Доступно только владельцу теста.
/// </summary>
public sealed record SetTestAvailability(
    Guid TestId, 
    DateTimeOffset? AvailableFrom, 
    DateTimeOffset? AvailableUntil) : IRequest;

public sealed class SetTestAvailabilityHandler(
    IUserContext userContext,
    ITestRepository tests)
    : IRequestHandler<SetTestAvailability>
{
    public async Task Handle(SetTestAvailability request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Нет прав на изменение теста.");

        test.SetAvailability(request.AvailableFrom, request.AvailableUntil);

        await tests.UpdateAsync(test, ct);
    }
}
