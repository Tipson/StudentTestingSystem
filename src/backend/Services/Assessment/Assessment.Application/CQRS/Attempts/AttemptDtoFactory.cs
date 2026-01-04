using Assessment.Application.DTOs.Attempt;
using Assessment.Domain.Attempts;
using Assessment.Domain.Tests;

namespace Assessment.Application.CQRS.Attempts;

internal static class AttemptDtoFactory
{
    public static AttemptDetailDto CreateDetailDto(Attempt attempt, Test test)
    {
        var answers = (attempt.Answers ?? Array.Empty<AttemptAnswer>())
            .Select(a => new AttemptAnswerDto(
                a.Id,
                a.QuestionId,
                new AnswerPayloadDto(
                    a.Answer.OptionId,
                    a.Answer.OptionIds,
                    a.Answer.Text
                ),
                a.UpdatedAt,
                a.IsCorrect,
                a.PointsAwarded
            ))
            .ToList();

        var timeRemaining = CalculateTimeRemaining(test.TimeLimitSeconds, attempt.StartedAt);

        return new AttemptDetailDto(
            attempt.Id,
            attempt.TestId,
            test.Title,
            attempt.UserId,
            attempt.Status.ToString(),
            attempt.StartedAt,
            attempt.SubmittedAt,
            attempt.Score,
            attempt.IsPassed,
            test.TimeLimitSeconds,
            timeRemaining,
            answers
        );
    }

    private static int? CalculateTimeRemaining(int? timeLimitSeconds, DateTimeOffset startedAt)
    {
        if (timeLimitSeconds is null)
            return null;

        var elapsedSeconds = (int)Math.Max(0, (DateTimeOffset.UtcNow - startedAt).TotalSeconds);
        var remaining = Math.Max(0, timeLimitSeconds.Value - elapsedSeconds);
        return remaining;
    }
}
