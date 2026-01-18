using Application;
using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using Contracts.Assessment.Enums;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Attempts.Queries;

/// <summary>
/// Возвращает все попытки, требующие ручной проверки преподавателем.
/// Доступно только для преподавателей и админов.
/// </summary>
public sealed record GetPendingReview : IRequest<List<StudentTestResultDto>>;

public sealed class GetPendingReviewHandler(
    IUserContext userContext,
    IAttemptRepository attempts,
    ITestRepository tests)
    : IRequestHandler<GetPendingReview, List<StudentTestResultDto>>
{
    public async Task<List<StudentTestResultDto>> Handle(GetPendingReview request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        // Получаем все тесты текущего преподавателя
        var teacherTests = await tests.ListByOwnerAsync(userId, ct);
        var testIds = teacherTests.Select(t => t.Id).ToList();

        if (!testIds.Any())
            return new List<StudentTestResultDto>();

        // Получаем все попытки по этим тестам
        var allAttempts = new List<Assessment.Domain.Attempts.Attempt>();
        foreach (var testId in testIds)
        {
            var testAttempts = await attempts.ListByTestAsync(testId, ct);
            allAttempts.AddRange(testAttempts);
        }

        // Фильтруем только завершенные попытки
        var submittedAttempts = allAttempts
            .Where(a => a.Status == AttemptStatus.Submitted)
            .ToList();

        if (!submittedAttempts.Any())
            return new List<StudentTestResultDto>();

        // Проверяем какие попытки требуют ручной проверки
        var pendingReview = new List<StudentTestResultDto>();

        foreach (var attempt in submittedAttempts)
        {
            // Загружаем попытку с ответами
            var attemptWithAnswers = await attempts.GetWithAnswersAsync(attempt.Id, ct);
            if (attemptWithAnswers is null) continue;

            // Проверяем есть ли ответы требующие ручной проверки
            var hasManualGrading = attemptWithAnswers.Answers
                .Any(a => a.ManualGradingRequired);

            if (hasManualGrading)
            {
                pendingReview.Add(attemptWithAnswers.Adapt<StudentTestResultDto>());
            }
        }

        return pendingReview.OrderByDescending(x => x.SubmittedAt).ToList();
    }
}
