using Contracts.Assessment;

namespace Assessment.Domain.Attempts;

public partial class AttemptAnswer
{
    /// <summary>
    /// Обновить ответ.
    /// </summary>
    public void SetAnswer(AnswerPayload payload)
    {
        Answer = payload ?? throw new ArgumentNullException(nameof(payload));
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// Установить результат проверки.
    /// </summary>
    public void SetResult(bool isCorrect, int pointsAwarded)
    {
        IsCorrect = isCorrect;
        PointsAwarded = pointsAwarded;
    }
    
    /// <summary>
    /// Установить результат ручной проверки преподавателем.
    /// </summary>
    public void SetManualGrade(int points, string? comment = null)
    {
        if (points < 0)
            throw new ArgumentException("Баллы не могут быть отрицательными", nameof(points));

        PointsAwarded = points;
        IsCorrect = points > 0;
        Feedback = comment;
        ManualGradingRequired = false;
    }
}