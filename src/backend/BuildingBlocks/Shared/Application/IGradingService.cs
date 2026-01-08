using Contracts.Assessment;
using Contracts.Grading.Models;

namespace Application;

public interface IGradingService
{
    /// <summary>
    /// Автоматическая проверка ответа.
    /// </summary>
    GradingResult GradeAnswer(AnswerPayload answer, QuestionData question);

    /// <summary>
    /// Ручная проверка ответа преподавателем.
    /// </summary>
    GradingResult GradeManually(int points, int maxPoints, string? comment = null);

    /// <summary>
    /// Пересчитать общий балл попытки.
    /// </summary>
    (int Score, int TotalPoints, int EarnedPoints) CalculateScore(
        List<GradingResult> results,
        List<QuestionData> questions);
}