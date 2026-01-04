using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using Assessment.Domain.Attempts;
using Assessment.Domain.Tests;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Identity;
using MediatR;

namespace Assessment.Application.CQRS.Attempts.Commands;

public sealed record StartAttempt(Guid TestId) : IRequest<AttemptDetailDto>;

public sealed class StartAttemptHandler(
    IUserContext userContext,
    ITestRepository tests,
    IAttemptRepository attempts)
    : IRequestHandler<StartAttempt, AttemptDetailDto>
{
    public async Task<AttemptDetailDto> Handle(StartAttempt request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        if (test.Status != TestStatus.Published)
            throw new BadRequestApiException("Тест ещё не опубликован.");

        var activeAttempt = await attempts.GetActiveAsync(userId, request.TestId, ct);
        Attempt attempt;

        if (activeAttempt is not null)
        {
            attempt = await attempts.GetWithAnswersAsync(activeAttempt.Id, ct)
                      ?? throw new EntityNotFoundException("Попытка не найдена.");
        }
        else
        {
            var attemptsCount = await attempts.CountByUserAndTestAsync(userId, request.TestId, ct);
            if (attemptsCount >= test.AttemptsLimit)
                throw new BadRequestApiException("Лимит попыток исчерпан.");

            attempt = new Attempt(test.Id, userId);
            
            await attempts.AddAsync(attempt, ct);
        }

        return AttemptDtoFactory.CreateDetailDto(attempt, test);
    }
}
