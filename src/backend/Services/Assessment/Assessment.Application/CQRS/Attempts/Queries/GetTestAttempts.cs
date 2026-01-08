using Application;
using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Attempts.Queries;

/// <summary>
/// Получить все попытки по тесту (для преподавателя).
/// </summary>
public sealed record GetTestAttempts(Guid TestId) : IRequest<List<AttemptDto>>;

public sealed class GetTestAttemptsHandler(
    IUserContext userContext,
    ITestRepository tests,
    IAttemptRepository attempts)
    : IRequestHandler<GetTestAttempts, List<AttemptDto>>
{
    public async Task<List<AttemptDto>> Handle(GetTestAttempts request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден");

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Нет доступа к попыткам этого теста");

        var list = await attempts.ListByTestAsync(request.TestId, ct);

        return list.Adapt<List<AttemptDto>>();
    }
}