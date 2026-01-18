using Application;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
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
        var test = await tests.GetWithQuestionsAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден");

        if (test.OwnerUserId != userContext.UserId)
            throw new ForbiddenException("Нет прав на публикацию теста");

        test.Publish();

        await tests.UpdateAsync(test, ct);
    }
}