using Assessment.Application.DTOs.Test;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using Identity.Application.Interfaces;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Queries;

/// <summary>
/// Возвращает тест по идентификатору.
/// Доступно только владельцу.
/// </summary>
public sealed record GetTest(Guid TestId) : IRequest<TestDto>;

public sealed class GetTestHandler(
    IUserContext userContext,
    ITestRepository tests)
    : IRequestHandler<GetTest, TestDto>
{
    public async Task<TestDto> Handle(GetTest request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Нет доступа.");

        return test.Adapt<TestDto>();
    }
}