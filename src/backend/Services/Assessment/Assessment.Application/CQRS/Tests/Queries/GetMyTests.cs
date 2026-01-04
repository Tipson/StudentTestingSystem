using Assessment.Application.DTOs.Test;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using Identity.Application.Interfaces;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Queries;

/// <summary>
/// Возвращает список тестов текущего пользователя.
/// </summary>
public sealed record GetMyTests : IRequest<List<TestDto>>;

public sealed class GetMyTestsHandler(
    IUserContext userContext,
    ITestRepository tests)
    : IRequestHandler<GetMyTests, List<TestDto>>
{
    public async Task<List<TestDto>> Handle(GetMyTests request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var list = await tests.ListByOwnerAsync(userId, ct);
        return list.Adapt<List<TestDto>>();
    }
}