namespace Contracts.Grading.Messages;

/// <summary>
/// Ответ после ручной проверки.
/// </summary>
public sealed record ManualGradeResponse(
    Guid AttemptId,
    Guid QuestionId,
    int PointsAwarded,
    string? Feedback,
    int TotalEarnedPoints,
    int TotalMaxPoints,
    int ScorePercentage
);
