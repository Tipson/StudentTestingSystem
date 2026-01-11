namespace Assessment.Application.DTOs.Attempt;

public sealed record AttemptScoreDto(
    Guid AttemptId,
    Guid TestId,
    int ScorePercent,
    int CorrectAnswers,
    bool IsPassed
);