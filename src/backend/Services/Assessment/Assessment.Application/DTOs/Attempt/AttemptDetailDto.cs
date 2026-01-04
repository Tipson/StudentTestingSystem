namespace Assessment.Application.DTOs.Attempt;

public sealed record AttemptDetailDto(
    Guid Id,
    Guid TestId,
    string TestTitle,
    string UserId,
    string Status,
    DateTimeOffset StartedAt,
    DateTimeOffset? SubmittedAt,
    int? Score,
    bool? IsPassed,
    int? TimeLimitSeconds,
    int? TimeRemainingSeconds,
    List<AttemptAnswerDto> Answers
);