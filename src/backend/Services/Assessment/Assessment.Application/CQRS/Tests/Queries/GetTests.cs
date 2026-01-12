using Application;
using Assessment.Application.DTOs.Test;
using Assessment.Application.Interfaces;
using Assessment.Domain.Tests;
using Contracts.Assessment.Enums;
using Contracts.Identity;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Queries;

/// <summary>
/// Получить список доступных тестов для текущего пользователя.
/// </summary>
public sealed record GetTests : IRequest<List<TestDto>>;

public sealed class GetTestsHandler(
    IUserContext userContext,
    ITestRepository tests,
    ITestAccessRepository testAccesses)
    : IRequestHandler<GetTests, List<TestDto>>
{
    public async Task<List<TestDto>> Handle(GetTests request, CancellationToken ct)
    {
        var userId = userContext.UserId;
        var userGroupId = userContext.GroupId;

        var availableTests = new List<Test>();

        // Публичные опубликованные тесты
        var publicTests = await tests.ListPublishedPublicAsync(ct);
        availableTests.AddRange(publicTests);

        {
            // Личные доступы
            var userAccesses = await testAccesses.GetByUserIdAsync(userId, ct);
            var personalTestIds = userAccesses
                .Where(a => a.CanBeUsed())
                .Select(a => a.TestId)
                .ToHashSet();

            var personalTests = await tests.GetByIdsAsync(personalTestIds, ct);
            availableTests.AddRange(personalTests);

            // Доступы через группу
            if (userGroupId.HasValue)
            {
                var groupAccesses = await testAccesses.GetByGroupIdAsync(userGroupId.Value, ct);
                var groupTestIds = groupAccesses
                    .Where(a => a.CanBeUsed())
                    .Select(a => a.TestId)
                    .ToHashSet();

                var groupTests = await tests.GetByIdsAsync(groupTestIds, ct);
                availableTests.AddRange(groupTests);
            }
        }

        // Убираем дубликаты и фильтруем по доступности
        var uniqueTests = availableTests
            .Distinct()
            .Where(t => t.Status == TestStatus.Published && t.IsAvailable())
            .ToList();

        return uniqueTests.Adapt<List<TestDto>>();
    }
}