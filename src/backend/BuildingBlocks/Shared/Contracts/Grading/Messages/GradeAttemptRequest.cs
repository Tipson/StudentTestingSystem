using Contracts.Assessment;
using Contracts.Grading.Models;

namespace Contracts.Grading.Messages;

/// <summary>
/// Запрос на проверку всех ответов попытки.
/// Используется как для HTTP, так и для RabbitMQ.
/// </summary>
public sealed record GradeAttemptRequest
{
    public Guid AttemptId { get; init; }
    public List<AnswerData> Answers { get; init; } = [];
    public List<QuestionData> Questions { get; init; } = [];

    /// <summary>
    /// Конструктор с параметрами.
    /// </summary>
    public GradeAttemptRequest(
        Guid attemptId,
        List<AnswerData> answers,
        List<QuestionData> questions)
    {
        AttemptId = attemptId;
        Answers = answers;
        Questions = questions;
    }
}

/// <summary>
/// Данные ответа студента для проверки.
/// </summary>
public sealed record AnswerData
{
    public Guid QuestionId { get; init; }
    public AnswerPayload Payload { get; init; } = new();
}