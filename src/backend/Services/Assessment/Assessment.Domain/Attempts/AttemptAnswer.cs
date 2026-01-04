namespace Assessment.Domain.Attempts;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

/// <summary>
///     Ответ студента на конкретный вопрос в рамках попытки.
/// </summary>
[Table("AttemptAnswers", Schema = "assessment")]
public sealed class AttemptAnswer
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; init; }

    [Required]
    public Guid AttemptId { get; init; }

    [Required]
    public Guid QuestionId { get; init; }

    /// <summary>
    ///     Ответ на вопрос
    /// </summary>
    [Required]
    [Column(TypeName = "jsonb")]
    public AnswerPayload Answer { get; private set; } = default!;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    ///     Результат автопроверки (если применимо). Заполняется при submit.
    /// </summary>
    public bool? IsCorrect { get; set; }

    /// <summary>
    ///     Начисленные баллы (если применимо). Заполняется при submit.
    /// </summary>
    [Range(0, 1000)]
    public int? PointsAwarded { get; set; }
}
