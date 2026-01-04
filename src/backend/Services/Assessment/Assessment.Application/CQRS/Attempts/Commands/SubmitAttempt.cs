using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using Assessment.Domain.Attempts;
using Assessment.Domain.Questions;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Identity;
using MediatR;

namespace Assessment.Application.CQRS.Attempts.Commands;

/// <summary>
/// Завершить попытку и получить результат.
/// </summary>
public sealed record SubmitAttempt(Guid AttemptId) : IRequest<AttemptResultDto>;

public sealed class SubmitAttemptHandler(
    IUserContext userContext,
    IAttemptRepository attempts,
    ITestRepository tests,
    IQuestionRepository questions)
    : IRequestHandler<SubmitAttempt, AttemptResultDto>
{
    public async Task<AttemptResultDto> Handle(SubmitAttempt request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        // Загружаем попытку
        var attempt = await attempts.GetWithAnswersAsync(request.AttemptId, ct)
                      ?? throw new EntityNotFoundException("Попытка не найдена");

        // Проверка владельца
        if (attempt.UserId != userId)
            throw new ForbiddenException("Нет доступа к этой попытке");

        // Проверка статуса
        if (attempt.Status != AttemptStatus.InProgress)
            throw new BadRequestApiException("Попытка уже завершена");

        // Загружаем тест и вопросы
        var test = await tests.GetByIdAsync(attempt.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден");

        var testQuestions = await questions.ListByTestIdAsync(test.Id, ct);

        // Рассчитываем результат
        var (score, earnedPoints, totalPoints, correctCount) = CalculateResult(attempt, testQuestions);

        // Завершаем попытку
        attempt.Submit(score, test.PassScore);
        await attempts.UpdateAsync(attempt, ct);

        // Формируем детальный результат
        var questionResults = BuildQuestionResults(attempt, testQuestions);

        return new AttemptResultDto(
            attempt.Id,
            test.Id,
            test.Title,
            score,
            test.PassScore,
            attempt.IsPassed ?? false,
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

    private static (int Score, int EarnedPoints, int TotalPoints, int CorrectCount) CalculateResult(
        Attempt attempt,
        List<Question> testQuestions)
    {
        var totalPoints = testQuestions.Sum(q => q.Points);
        var earnedPoints = 0;
        var correctCount = 0;

        foreach (var question in testQuestions)
        {
            var answer = attempt.Answers.FirstOrDefault(a => a.QuestionId == question.Id);
            
            if (answer is null)
            {
                // Нет ответа — 0 баллов
                continue;
            }

            var (isCorrect, points) = CheckAnswer(answer.Answer, question);
            answer.SetResult(isCorrect, points);
            earnedPoints += points;
            
            if (isCorrect)
                correctCount++;
        }

        var score = totalPoints > 0
            ? (int)Math.Round((double)earnedPoints / totalPoints * 100)
            : 0;

        return (score, earnedPoints, totalPoints, correctCount);
    }

    private static (bool IsCorrect, int Points) CheckAnswer(AnswerPayload answer, Question question)
    {
        var correctOptions = question.Options.Where(o => o.IsCorrect).ToList();

        return question.Type switch
        {
            QuestionType.SingleChoice or QuestionType.TrueFalse =>
                CheckSingleChoice(answer, correctOptions, question.Points),

            QuestionType.MultiChoice =>
                CheckMultiChoice(answer, correctOptions, question.Points),

            QuestionType.ShortText =>
                CheckShortText(answer, correctOptions, question.Points),

            // LongText требует ручной проверки
            _ => (false, 0)
        };
    }

    private static (bool IsCorrect, int Points) CheckSingleChoice(
        AnswerPayload answer,
        List<QuestionOption> correctOptions,
        int maxPoints)
    {
        if (answer.OptionId is null || correctOptions.Count == 0)
            return (false, 0);

        var isCorrect = correctOptions.Any(o => o.Id == answer.OptionId);
        return (isCorrect, isCorrect ? maxPoints : 0);
    }

    private static (bool IsCorrect, int Points) CheckMultiChoice(
        AnswerPayload answer,
        List<QuestionOption> correctOptions,
        int maxPoints)
    {
        if (answer.OptionIds is null || answer.OptionIds.Count == 0 || correctOptions.Count == 0)
            return (false, 0);

        var correctIds = correctOptions.Select(o => o.Id).ToHashSet();
        var selectedIds = answer.OptionIds.ToHashSet();

        // Полное совпадение
        if (correctIds.SetEquals(selectedIds))
            return (true, maxPoints);

        // Частичная оценка
        var correctSelected = selectedIds.Intersect(correctIds).Count();
        var incorrectSelected = selectedIds.Except(correctIds).Count();

        // Формула: (правильные - неправильные) / всего_правильных * баллы
        var partialScore = (double)(correctSelected - incorrectSelected) / correctIds.Count;
        var points = Math.Max(0, (int)Math.Round(partialScore * maxPoints));

        return (false, points);
    }

    private static (bool IsCorrect, int Points) CheckShortText(
        AnswerPayload answer,
        List<QuestionOption> correctOptions,
        int maxPoints)
    {
        if (string.IsNullOrWhiteSpace(answer.Text) || correctOptions.Count == 0)
            return (false, 0);

        // Сравниваем с правильными вариантами (без учёта регистра, trim)
        var userAnswer = answer.Text.Trim();
        var isCorrect = correctOptions.Any(o =>
            string.Equals(o.Text.Trim(), userAnswer, StringComparison.OrdinalIgnoreCase));

        return (isCorrect, isCorrect ? maxPoints : 0);
    }

    private static List<QuestionResultDto> BuildQuestionResults(Attempt attempt, List<Question> questions)
    {
        return questions.Select(q =>
        {
            var answer = attempt.Answers.FirstOrDefault(a => a.QuestionId == q.Id);
            var correctOptions = q.Options.Where(o => o.IsCorrect).ToList();

            AnswerPayloadDto? correctAnswer = q.Type switch
            {
                QuestionType.SingleChoice or QuestionType.TrueFalse =>
                    correctOptions.FirstOrDefault() is { } co
                        ? new AnswerPayloadDto(co.Id, null, null)
                        : null,

                QuestionType.MultiChoice =>
                    new AnswerPayloadDto(null, correctOptions.Select(o => o.Id).ToList(), null),

                QuestionType.ShortText =>
                    correctOptions.FirstOrDefault() is { } so
                        ? new AnswerPayloadDto(null, null, so.Text)
                        : null,

                _ => null
            };

            return new QuestionResultDto(
                q.Id,
                q.Text,
                q.Type.ToString(),
                q.Points,
                answer?.PointsAwarded ?? 0,
                answer?.IsCorrect ?? false,
                answer is not null
                    ? new AnswerPayloadDto(answer.Answer.OptionId, answer.Answer.OptionIds, answer.Answer.Text)
                    : null,
                correctAnswer
            );
        }).ToList();
    }
}