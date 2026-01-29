using Application;
using Assessment.Application.DTOs.Test;
using Assessment.Application.Interfaces;
using Assessment.Domain.Tests;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Commands;

/// <summary>
/// Создаёт новый тест в статусе «Черновик» для текущего аутентифицированного пользователя.
/// </summary>
public sealed record CreateTest(CreateTestDto Dto) : IRequest<TestDto>;

public sealed class CreateTestHandler(
    IUserContext userContext,
    ITestRepository tests)
    : IRequestHandler<CreateTest, TestDto>
{
    public async Task<TestDto> Handle(CreateTest request, CancellationToken ct)
    {
        var test = new Test(
            userContext.UserId,
            request.Dto.Title,
            request.Dto.Description,
            request.Dto.AllowAiHints);

        await tests.AddAsync(test, ct);

        return test.Adapt<TestDto>();
    }
}