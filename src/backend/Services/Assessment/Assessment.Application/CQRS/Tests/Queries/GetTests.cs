using Assessment.Application.DTOs.Test;
using Assessment.Application.Interfaces;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Queries;

/// <summary>
/// Получить все опубликованные тесты (доступные для прохождения).
/// </summary>
public sealed record GetTests : IRequest<List<TestDto>>;

public sealed class GetTestsHandler(ITestRepository tests) 
    : IRequestHandler<GetTests, List<TestDto>>
{
    public async Task<List<TestDto>> Handle(GetTests request, CancellationToken ct)
    {
        var publishedTests = await tests.ListPublishedAsync(ct);
        return publishedTests.Adapt<List<TestDto>>();
    }
}