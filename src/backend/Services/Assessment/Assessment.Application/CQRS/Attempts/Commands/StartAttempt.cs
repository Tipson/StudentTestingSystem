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
        // UserId у тебя string, но оставляю как было (не мешает)
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        if (test.Status != TestStatus.Published)
            throw new BadRequestApiException("Тест ещё не опубликован.");

        // ПРОВЕРКА ДОСТУПА (по владельцу / public / персональный / групповой)
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
        }
        catch (Exception ex) when (ex.InnerException?.Message.Contains("duplicate key") == true)
        {
            // Параллельный запрос уже создал attempt - загружаем его
            var existingAttempt = await attempts.GetActiveAsync(userId, request.TestId, ct)
                                  ?? throw new EntityNotFoundException("Попытка не найдена.");
            return AttemptDtoFactory.CreateDetailDto(existingAttempt, test);
        }

        return AttemptDtoFactory.CreateDetailDto(newAttempt, test);
    }

    private async Task<bool> CheckAccess(Test test, string userId, Guid? userGroupId, CancellationToken ct)
    {
        // Владелец имеет доступ всегда
        if (test.OwnerUserId == userId)
            return true;

        // Публичный тест — доступен всем
        if (test.AccessType == TestAccessType.Public)
            return true;

        // Личный доступ
        var personalAccess = await testAccesses.GetByTestAndUserAsync(test.Id, userId, ct);
        if (personalAccess is not null && personalAccess.CanBeUsed())
            return true;

        // Доступ через группу
        if (userGroupId is null)
            return false;

        var groupAccess = await testAccesses.GetByTestAndGroupAsync(test.Id, userGroupId.Value, ct);
        return groupAccess is not null && groupAccess.CanBeUsed();
    }
}
