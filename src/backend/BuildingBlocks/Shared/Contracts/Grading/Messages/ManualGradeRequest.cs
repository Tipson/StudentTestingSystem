namespace Contracts.Grading.Messages;

/// <summary>
/// Запрос на ручную проверку одного ответа преподавателем.
/// </summary>
public sealed record ManualGradeRequest(
    Guid AttemptId,
    Guid QuestionId,
    int Points,
    int MaxPoints,
    string? Comment,
    List<AnswerResult> AllAnswers,
    List<QuestionInfo> AllQuestions
);

/// <summary>
/// Информация об ответе для пересчета общего балла.
/// </summary>
public sealed record AnswerResult(
    Guid QuestionId,
    int PointsAwarded
);

/// <summary>
/// Информация о вопросе для пересчета общего балла.
/// </summary>
public sealed record QuestionInfo(
    Guid QuestionId,
    int MaxPoints
);
