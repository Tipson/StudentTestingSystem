using Contracts.Assessment.Enums;

namespace Contracts.Grading.Models;

/// <summary>
/// Данные вопроса для проверки (упрощённая версия Question entity).
/// </summary>
public sealed record QuestionData
{
    public Guid Id { get; init; }
    public QuestionType Type { get; init; }
    public int MaxPoints { get; init; }
    public List<CorrectOptionData> CorrectOptions { get; init; }
}