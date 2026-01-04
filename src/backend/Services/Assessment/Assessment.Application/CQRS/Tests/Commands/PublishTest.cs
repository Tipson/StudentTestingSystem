using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Commands;

/// <summary>
/// Публикует тест.
/// Доступно только владельцу и только для тестов в статусе «Черновик».
/// </summary>
public sealed record PublishTest(Guid TestId) : IRequest;

public sealed class PublishTestHandler(
    IUserContext userContext,
    ITestRepository tests)
    : IRequestHandler<PublishTest>
{
    public async Task Handle(PublishTest request, CancellationToken ct)
    {
        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден");

        if (test.OwnerUserId != userContext.UserId)
            throw new ForbiddenException("Нет прав на публикацию теста");

        test.Publish(); // Используем метод из Domain

        await tests.UpdateAsync(test, ct);
    }
}