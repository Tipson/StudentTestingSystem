using Application;
using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using Assessment.Domain.Attempts;
using Assessment.Domain.Tests;
using Assessment.Domain.Tests.Enums;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Assessment.Enums;
using MediatR;
using Metrics;

namespace Assessment.Application.CQRS.Attempts.Commands;

public sealed record StartAttempt(Guid TestId) : IRequest<AttemptDetailDto>;

public sealed class StartAttemptHandler(
    IUserContext userContext,
    ITestRepository tests,
    IAttemptRepository attempts,
    ITestAccessRepository testAccesses)
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
        
        if (!test.IsAvailable())
        {
            if (test.AvailableFrom.HasValue && DateTimeOffset.UtcNow < test.AvailableFrom.Value)
                throw new BadRequestApiException($"Тест будет доступен с {test.AvailableFrom.Value:dd.MM.yyyy HH:mm}");
    
            if (test.AvailableUntil.HasValue && DateTimeOffset.UtcNow > test.AvailableUntil.Value)
                throw new BadRequestApiException("Срок прохождения теста истек");
        }

        var hasAccess = await CheckAccess(test, userId, userContext.GroupId, ct);
        if (!hasAccess)
            throw new ForbiddenException("У вас нет доступа к этому тесту.");

        var activeAttempt = await attempts.GetActiveAsync(userId, request.TestId, ct);

        if (activeAttempt is not null)
        {
            var attempt = await attempts.GetWithAnswersAsync(activeAttempt.Id, ct)
                          ?? throw new EntityNotFoundException("Попытка не найдена.");
            return AttemptDtoFactory.CreateDetailDto(attempt, test);
        }

        var attemptsCount = await attempts.CountByUserAndTestAsync(userId, request.TestId, ct);
        if (attemptsCount >= test.AttemptsLimit)
            throw new BadRequestApiException("Лимит попыток исчерпан.");

        var newAttempt = new Attempt(test.Id, userId);

        try
        {
            await attempts.AddAsync(newAttempt, ct);
            
            // Метрики: попытка успешно начата
            AssessmentMetrics.AttemptsStarted.Inc();
            AssessmentMetrics.ActiveAttempts.Inc();
        }
        catch (Exception ex) when (ex.InnerException?.Message?.Contains("23505") == true)
        {
            var existingAttempt = await attempts.GetActiveAsync(userId, request.TestId, ct)
                                  ?? throw new EntityNotFoundException("Попытка не найдена.");
            return AttemptDtoFactory.CreateDetailDto(existingAttempt, test);
        }

        return AttemptDtoFactory.CreateDetailDto(newAttempt, test);
    }

    private async Task<bool> CheckAccess(Test test, string userId, Guid? userGroupId, CancellationToken ct)
    {
        if (test.OwnerUserId == userId)
            return true;

        if (test.AccessType == TestAccessType.Public)
            return true;

        var personalAccess = await testAccesses.GetByTestAndUserAsync(test.Id, userId, ct);
        if (personalAccess is not null && personalAccess.CanBeUsed())
            return true;

        if (userGroupId.HasValue)
        {
            var groupAccess = await testAccesses.GetByTestAndGroupAsync(test.Id, userGroupId.Value, ct);
            if (groupAccess is not null && groupAccess.CanBeUsed())
                return true;
        }

        return false;
    }
}
