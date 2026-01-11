using Application;
using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using Assessment.Domain.Attempts;
using Assessment.Domain.Questions;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Assessment.Enums;
using Contracts.Grading.Models;
using MapsterMapper;
using MediatR;

namespace Assessment.Application.CQRS.Attempts.Commands;

/// <summary>
/// Завершает попытку и возвращает итоговый результат.
/// </summary>
public sealed record SubmitAttempt(Guid AttemptId) : IRequest<AttemptResultDto>;

public sealed class SubmitAttemptHandler(
    IUserContext userContext,
    IAttemptRepository attempts,
    ITestRepository tests,
    IQuestionRepository questions,
    IGradingService grading,
    IMapper mapper)
    : IRequestHandler<SubmitAttempt, AttemptResultDto>
{
    public async Task<AttemptResultDto> Handle(SubmitAttempt request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var attempt = await attempts.GetWithAnswersAsync(request.AttemptId, ct)
                      ?? throw new EntityNotFoundException("Попытка не найдена");

        if (attempt.UserId != userId)
            throw new ForbiddenException("Нет доступа к этой попытке");

        if (attempt.Status != AttemptStatus.InProgress)
            throw new BadRequestApiException("Попытка уже завершена");

        var test = await tests.GetByIdAsync(attempt.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден");

        if (attempt.IsTimeExpired(test.TimeLimitSeconds))
            throw new BadRequestApiException("Время на прохождение теста истекло");

        var testQuestions = await questions.ListByTestIdAsync(test.Id, ct);

        // Проверяем все ответы через GradingService
        var gradingResults = GradeAllAnswers(attempt, testQuestions);

        // Подсчитываем баллы через GradingService
        var questionsData = testQuestions
            .Select(q => mapper.Map<QuestionData>(q))
            .ToList();

        var (_, totalPoints, earnedPoints) = grading.CalculateScore(gradingResults, questionsData);
        var correctCount = gradingResults.Count(r => r.IsCorrect);

        // сохраняем результат
        attempt.Submit(earnedPoints, test.PassScore);
        await attempts.UpdateAsync(attempt, ct);

        var requiresManualReview = testQuestions.Any(q =>
            q.Type == QuestionType.LongText &&
            attempt.Answers.Any(a => a.QuestionId == q.Id && a.ManualGradingRequired));

        // Формируем результат
        var questionResults = testQuestions
            .Select(q => mapper.Map<QuestionResultDto>((q, attempt.Answers.FirstOrDefault(a => a.QuestionId == q.Id))))
            .ToList();

        return new AttemptResultDto(
            attempt.Id,
            test.Id,
            test.Title,
            earnedPoints,
            test.PassScore,
            attempt.IsPassed ?? false,
            requiresManualReview,
            totalPoints,
            earnedPoints,
            testQuestions.Count,
            correctCount,
            attempt.StartedAt,
            attempt.SubmittedAt ?? DateTimeOffset.UtcNow,
            (attempt.SubmittedAt ?? DateTimeOffset.UtcNow) - attempt.StartedAt,
            questionResults
        );
    }

    /// <summary>
    /// Проверяет все ответы через GradingService и обновляет их.
    /// </summary>
    private List<GradingResult> GradeAllAnswers(Attempt attempt, List<Question> testQuestions)
    {
        var results = new List<GradingResult>();

        foreach (var question in testQuestions)
        {
            var answer = attempt.Answers.FirstOrDefault(a => a.QuestionId == question.Id);

            if (answer is null)
            {
                results.Add(GradingResult.Incorrect());
                continue;
            }

            // Преобразуем Question в QuestionData для GradingService
            var questionData = new QuestionData
            {
                Id = question.Id,
                Type = question.Type,
                MaxPoints = question.Points,
                CorrectOptions = question.Options
                    .Where(o => o.IsCorrect)
                    .Select(o => new CorrectOptionData
                    {
                        Id = o.Id,
                        Text = o.Text
                    })
                    .ToList()
            };

            // Проверяем через GradingService
            var result = grading.GradeAnswer(answer.Answer, questionData);
            results.Add(result);

            // Обновляем ответ
            answer.SetResult(result.IsCorrect, result.PointsAwarded);
            answer.ManualGradingRequired = result.RequiresManualReview;
        }

        return results;
    }
}