namespace Assessment.Application.DTOs.Attempt;

public sealed record AttemptDto(
    Guid Id,
    Guid TestId,
    string UserId,
    string Status,
    DateTimeOffset StartedAt,
    DateTimeOffset? SubmittedAt,
    int? Score,
    bool? IsPassed
);