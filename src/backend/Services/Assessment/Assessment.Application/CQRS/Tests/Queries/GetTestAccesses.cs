using Application;
using Assessment.Application.DTOs.Test;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Identity;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Queries;

/// <summary>
/// Получить список доступов к тесту.
/// </summary>
public sealed record GetTestAccesses(Guid TestId) : IRequest<List<TestAccessDto>>;

public sealed class GetTestAccessesHandler(
    IUserContext userContext,
    ITestRepository tests,
    ITestAccessRepository testAccesses)
    : IRequestHandler<GetTestAccesses, List<TestAccessDto>>
{
    public async Task<List<TestAccessDto>> Handle(GetTestAccesses request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Только владелец теста может просматривать доступы.");

        var accesses = await testAccesses.GetByTestIdAsync(request.TestId, ct);

        return accesses.Adapt<List<TestAccessDto>>();
    }
}