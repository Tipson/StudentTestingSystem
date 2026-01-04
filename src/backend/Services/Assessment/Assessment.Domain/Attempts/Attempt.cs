using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Assessment.Domain.Attempts;

/// <summary>
///     Попытка прохождения теста студентом.
/// </summary>
[Table("Attempts", Schema = "assessment")]
public sealed class Attempt
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; init; }

    [Required]
    public Guid TestId { get; init; }

    /// <summary>
    ///     Идентификатор студента (sub из Identity).
    /// </summary>
    [Required]
    public required string UserId { get; init; }

    [Required]
    public AttemptStatus Status { get; set; } = AttemptStatus.InProgress;

    public DateTimeOffset StartedAt { get; init; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? SubmittedAt { get; set; }

    /// <summary>
    ///     Итоговый процент (0..100). Заполняется при отправке.
    /// </summary>
    [Range(0, 100)]
    public int? Score { get; set; }

    /// <summary>
    ///     Пройден ли тест. Заполняется при отправке.
    /// </summary>
    public bool? IsPassed { get; set; }
    
    /// <summary>
    ///     Ответы студента на вопросы в рамках попытки.
    /// </summary>
    public IList<AttemptAnswer> Answers { get; init; } = new List<AttemptAnswer>();
}