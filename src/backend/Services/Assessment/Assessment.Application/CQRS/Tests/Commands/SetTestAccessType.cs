using Application;
using Assessment.Application.Interfaces;
using Assessment.Domain.Tests.Enums;
using BuildingBlocks.Api.Exceptions;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Commands;

/// <summary>
/// Устанавливает тип доступа к тесту (Public/Private).
/// Доступно только владельцу теста.
/// </summary>
public sealed record SetTestAccessType(Guid TestId, TestAccessType AccessType) : IRequest;

public sealed class SetTestAccessTypeHandler(
    IUserContext userContext,
    ITestRepository tests)
    : IRequestHandler<SetTestAccessType>
{
    public async Task Handle(SetTestAccessType request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Нет прав на изменение теста.");

        test.SetAccessType(request.AccessType);

        await tests.UpdateAsync(test, ct);
    }
}
