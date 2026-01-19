namespace BuildingBlocks.AI.Models;

/// <summary>
/// Запрос на AI проверку развернутого ответа.
/// </summary>
public sealed record GradingRequest(
    string QuestionText,
    string? ExpectedAnswer,
    string? StudentAnswer,
    int MaxPoints,
    List<Guid>? QuestionMediaIds = null,
    List<Guid>? AnswerMediaIds = null);

/// <summary>
/// Результат AI проверки.
/// </summary>
public sealed record GradingResponse(
    int Points,
    string Comment,
    double Confidence); // 0.0 - 1.0, насколько AI уверен в оценке