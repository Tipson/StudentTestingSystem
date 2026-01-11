namespace Assessment.Application.DTOs.Attempt;

public sealed record AttemptResultDto(
    Guid AttemptId,
    Guid TestId,
    string TestTitle,
    int Score,
    int PassScore,
    bool IsPassed,
    bool RequiresManualReview,
    int TotalPoints,
    int EarnedPoints,
    int TotalQuestions,
    int CorrectAnswers,
    DateTimeOffset StartedAt,
    DateTimeOffset SubmittedAt,
    TimeSpan Duration,
    List<QuestionResultDto> Questions
);
