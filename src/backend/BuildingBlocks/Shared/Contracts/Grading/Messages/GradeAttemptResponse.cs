using Contracts.Grading.Models;

namespace Contracts.Grading.Messages;

/// <summary>
/// Ответ с результатами проверки попытки.
/// </summary>
public sealed record GradeAttemptResponse
{
    public Guid AttemptId { get; init; }
    public List<QuestionGradingResult> Results { get; init; } = [];
    public int TotalPoints { get; init; }
    public int EarnedPoints { get; init; }
    public int Score { get; init; }

    /// <summary>
    /// Конструктор с параметрами.
    /// </summary>
    public GradeAttemptResponse(
        Guid attemptId,
        List<QuestionGradingResult> results,
        int totalPoints,
        int earnedPoints,
        int score)
    {
        AttemptId = attemptId;
        Results = results;
        TotalPoints = totalPoints;
        EarnedPoints = earnedPoints;
        Score = score;
    }
}

/// <summary>
/// Результат проверки одного вопроса.
/// </summary>
public sealed record QuestionGradingResult
{
    public Guid QuestionId { get; init; }
    public GradingResult Result { get; init; } = null!;

    /// <summary>
    /// Конструктор без параметров (для десериализации).
    /// </summary>
    public QuestionGradingResult() { }

    /// <summary>
    /// Конструктор с параметрами.
    /// </summary>
    public QuestionGradingResult(Guid questionId, GradingResult result)
    {
        QuestionId = questionId;
        Result = result;
    }
}