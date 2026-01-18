namespace Contracts.Grading.Messages;

/// <summary>
/// Запрос на AI-подсказку для оценки развернутого ответа.
/// </summary>
public sealed record SuggestGradeRequest
{
    public Guid AttemptId { get; init; }
    public Guid QuestionId { get; init; }
    public string QuestionText { get; init; } = string.Empty;
    public string? ExpectedAnswer { get; init; }
    public string StudentAnswer { get; init; } = string.Empty;
    public int MaxPoints { get; init; }

    /// <summary>
    /// Конструктор без параметров (для десериализации).
    /// </summary>
    public SuggestGradeRequest() { }

    /// <summary>
    /// Конструктор с параметрами.
    /// </summary>
    public SuggestGradeRequest(
        Guid attemptId,
        Guid questionId,
        string questionText,
        string? expectedAnswer,
        string studentAnswer,
        int maxPoints)
    {
        AttemptId = attemptId;
        QuestionId = questionId;
        QuestionText = questionText;
        ExpectedAnswer = expectedAnswer;
        StudentAnswer = studentAnswer;
        MaxPoints = maxPoints;
    }
}

/// <summary>
/// Ответ с AI-подсказкой оценки.
/// </summary>
public sealed record SuggestGradeResponse
{
    public int SuggestedPoints { get; init; }
    public string Comment { get; init; } = string.Empty;
    public double Confidence { get; init; }

    /// <summary>
    /// Конструктор без параметров (для десериализации).
    /// </summary>
    public SuggestGradeResponse() { }

    /// <summary>
    /// Конструктор с параметрами.
    /// </summary>
    public SuggestGradeResponse(int suggestedPoints, string comment, double confidence)
    {
        SuggestedPoints = suggestedPoints;
        Comment = comment;
        Confidence = confidence;
    }
}