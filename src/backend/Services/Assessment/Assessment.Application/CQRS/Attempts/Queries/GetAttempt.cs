using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using MediatR;

namespace Assessment.Application.CQRS.Attempts.Queries;

public sealed record GetAttempt(Guid AttemptId) : IRequest<AttemptDetailDto>;

public sealed class GetAttemptHandler(
    IUserContext userContext,
    IAttemptRepository attempts,
    ITestRepository tests)
    : IRequestHandler<GetAttempt, AttemptDetailDto>
{
    public async Task<AttemptDetailDto> Handle(GetAttempt request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var attempt = await attempts.GetWithAnswersAsync(request.AttemptId, ct)
                      ?? throw new EntityNotFoundException("Попытка не найдена.");

        var test = await tests.GetByIdAsync(attempt.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        if (attempt.UserId != userId && test.OwnerUserId != userId)
            throw new ForbiddenException("Нет доступа к попытке.");

        return AttemptDtoFactory.CreateDetailDto(attempt, test);
    }
}
