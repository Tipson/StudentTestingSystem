using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Contracts.Assessment;

namespace Assessment.Domain.Attempts;

/// <summary>
///     Ответ студента на конкретный вопрос в рамках попытки.
/// </summary>
[Table("AttemptAnswers", Schema = "assessment")]
public partial class AttemptAnswer
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; private set; }

    [Required] public Guid AttemptId { get; private set; }

    [Required] public Guid QuestionId { get; private set; }

    /// <summary>
    ///     Ответ на вопрос.
    /// </summary>
    [Required]
    [Column(TypeName = "jsonb")]
    public AnswerPayload Answer { get; private set; } = null!;

    public DateTimeOffset UpdatedAt { get; private set; } = DateTimeOffset.UtcNow;

    /// <summary>
    ///     Результат автопроверки (если применимо). Заполняется при submit.
    /// </summary>
    public bool? IsCorrect { get; set; }

    /// <summary>
    ///     Начисленные баллы (если применимо). Заполняется при submit.
    /// </summary>
    [Range(0, 1000)]
    public int? PointsAwarded { get; set; }
    
    /// <summary>
    /// Требуется ручная проверка преподавателем (для LongText вопросов).
    /// </summary>
    public bool ManualGradingRequired { get; set; }

    /// <summary>
    /// Комментарий преподавателя при ручной проверке.
    /// </summary>
    [MaxLength(2000)]
    public string? TeacherComment { get; set; }

    public AttemptAnswer(Guid attemptId, Guid questionId, AnswerPayload answer)
    {
        if (attemptId == Guid.Empty)
            throw new ArgumentException("AttemptId не может быть пустым", nameof(attemptId));

        if (questionId == Guid.Empty)
            throw new ArgumentException("QuestionId не может быть пустым", nameof(questionId));

        AttemptId = attemptId;
        QuestionId = questionId;
        Answer = answer ?? throw new ArgumentNullException(nameof(answer));
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}