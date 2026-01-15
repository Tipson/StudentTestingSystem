namespace BuildingBlocks.AI.Models;

/// <summary>
/// Запрос на генерацию теста из документа.
/// </summary>
public sealed record TestGenerationRequest(
    string DocumentText,
    int QuestionsCount,
    string? Topic);

/// <summary>
/// Результат генерации теста.
/// </summary>
public sealed record TestGenerationResponse(
    string TestTitle,
    string? Description,
    List<GeneratedQuestion> Questions);

/// <summary>
/// Сгенерированный вопрос.
/// </summary>
public sealed record GeneratedQuestion(
    string Text,
    QuestionType Type,
    List<string>? Options,
    string? CorrectAnswer,
    int Points);

public enum QuestionType
{
    SingleChoice,
    MultipleChoice,
    LongText
}