using Application;
using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using Assessment.Domain.Attempts;
using Assessment.Domain.Questions;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Assessment.Enums;
using MediatR;
using QuestionType = Contracts.Assessment.Enums.QuestionType;

namespace Assessment.Application.CQRS.Attempts.Queries;

/// <summary>
/// Получить результат завершённой попытки.
/// </summary>
public sealed record GetAttemptResult(Guid AttemptId) : IRequest<AttemptResultDto>;

public sealed class GetAttemptResultHandler(
    IUserContext userContext,
    IAttemptRepository attempts,
    ITestRepository tests,
    IQuestionRepository questions)
    : IRequestHandler<GetAttemptResult, AttemptResultDto>
{
    public async Task<AttemptResultDto> Handle(GetAttemptResult request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var attempt = await attempts.GetWithAnswersAsync(request.AttemptId, ct)
                      ?? throw new EntityNotFoundException("Попытка не найдена");

        var test = await tests.GetByIdAsync(attempt.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден");

        // Проверка доступа: студент (владелец попытки) или преподаватель (владелец теста)
        if (attempt.UserId != userId && test.OwnerUserId != userId)
            throw new ForbiddenException("Нет доступа к результатам");

        // Результат доступен только для завершённых попыток
        if (attempt.Status != AttemptStatus.Submitted)
            throw new BadRequestApiException("Попытка ещё не завершена");

        var testQuestions = await questions.ListByTestIdAsync(test.Id, ct);

        var totalPoints = testQuestions.Sum(q => q.Points);
        var earnedPoints = attempt.Answers.Sum(a => a.PointsAwarded ?? 0);
        var correctCount = attempt.Answers.Count(a => a.IsCorrect == true);

        var questionResults = BuildQuestionResults(attempt, testQuestions);

        return new AttemptResultDto(
            attempt.Id,
            test.Id,
            test.Title,
            attempt.Score ?? 0,
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