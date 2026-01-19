using Contracts.Assessment.Enums;

namespace BuildingBlocks.AI.Models;

/// <summary>
/// Запрос на генерацию теста из документа.
/// </summary>
public sealed record TestGenerationRequest(
    string DocumentText,
    int QuestionsCount,
    string? Topic,
    TestGenerationMode Mode = TestGenerationMode.Balanced,
    Guid? DocumentMediaId = null);

public enum TestGenerationMode
{
    Balanced = 0,
    ClosedQuestions = 1,
    OpenQuestions = 2,
    FinalExam = 3
}

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