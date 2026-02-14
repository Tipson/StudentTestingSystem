using Application;
using Assessment.Application.DTOs.Test;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using MapsterMapper;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Queries;

/// <summary>
/// Возвращает список тестов текущего пользователя с информацией об оставшихся попытках.
/// </summary>
public sealed record GetMyTests : IRequest<List<TestDto>>;

public sealed class GetMyTestsHandler(
    IUserContext userContext,
    ITestRepository tests,
    IAttemptRepository attempts,
    IMapper mapper)
    : IRequestHandler<GetMyTests, List<TestDto>>
{
    public async Task<List<TestDto>> Handle(GetMyTests request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        // 1. Получаем тесты пользователя
        var testList = await tests.ListByOwnerAsync(userId, ct);

        if (!testList.Any())
            return new List<TestDto>();

        // 2. Получаем количество использованных попыток для всех тестов одним запросом (избегаем N+1)
        var testIds = testList.Select(t => t.Id).ToList();
        var attemptsCount = await attempts.GetAttemptsCountByTestsAsync(testIds, userId, ct);

        // 3. Создаем кортежи (Test, usedAttempts) и маппим через Mapster
        var testsWithAttempts = testList
            .Select(test => (test, usedAttempts: attemptsCount.GetValueOrDefault(test.Id, 0)))
            .ToList();

        // 4. Mapster автоматически использует конфигурацию (Test, int) -> TestDto
        return mapper.Map<List<TestDto>>(testsWithAttempts);
    }
}
