namespace Assessment.Domain.Attempts;

public partial class Attempt
{
    /// <summary>
    /// Завершить попытку.
    /// </summary>
    public void Submit(int score, int passScore)
    {
        if (Status != AttemptStatus.InProgress)
            throw new InvalidOperationException("Попытка уже завершена");
        
        Status = AttemptStatus.Submitted;
        SubmittedAt = DateTimeOffset.UtcNow;
        Score = score;
        IsPassed = score >= passScore;
    }
    
    /// <summary>
    /// Проверить, не истекло ли время.
    /// </summary>
    public bool IsTimeExpired(int? timeLimitSeconds)
    {
        if (timeLimitSeconds is null)
            return false;

        var elapsed = DateTimeOffset.UtcNow - StartedAt;
        return elapsed.TotalSeconds > timeLimitSeconds.Value;
    }
    
    /// <summary>
    /// Добавить или обновить ответ.
    /// </summary>
    public AttemptAnswer SetAnswer(Guid questionId, AnswerPayload payload)
    {
        if (Status != AttemptStatus.InProgress)
            throw new InvalidOperationException("Попытка уже завершена");

        var existing = Answers.FirstOrDefault(a => a.QuestionId == questionId);
        
        if (existing is not null)
        {
            existing.SetAnswer(payload);
            return existing;
        }

        var answer = new AttemptAnswer(Id, questionId, payload);
        Answers.Add(answer);
        return answer;
    }
}
