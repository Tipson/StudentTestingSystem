namespace Assessment.Application.DTOs.Attempt;

public sealed record AttemptScoreDto(
    Guid AttemptId,
    Guid TestId,
    int Score,
    int PassScore,
    bool IsPassed
);