namespace Assessment.Application.DTOs.Attempt;

public sealed record StudentTestResultDto(
    Guid AttemptId,
    Guid TestId,
    string StudentId,
    int? Score,
    bool? IsPassed,
    DateTimeOffset? SubmittedAt
);