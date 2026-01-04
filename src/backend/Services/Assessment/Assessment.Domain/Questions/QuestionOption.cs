using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Assessment.Domain.Questions;

/// <summary>
///     Вариант ответа для вопроса.
/// </summary>
[Table("QuestionOptions", Schema = "assessment")]
public sealed class QuestionOption
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; init; }

    /// <summary>
    ///     Идентификатор вопроса, к которому относится вариант.
    /// </summary>
    [Required]
    public Guid QuestionId { get; init; }

    /// <summary>
    ///     Порядок отображения варианта.
    /// </summary>
    [Range(1, int.MaxValue)]
    public int Order { get; set; }

    /// <summary>
    ///     Текст варианта ответа.
    /// </summary>
    [Required]
    [MaxLength(2000)]
    public required string Text { get; set; }

    /// <summary>
    ///     Признак правильного варианта (для автопроверки).
    /// </summary>
    public bool IsCorrect { get; set; }

    /// <summary>
    ///     Медиа, прикреплённые к варианту ответа.
    /// </summary>
    public IList<QuestionOptionMedia> Media { get; init; } = new List<QuestionOptionMedia>();
}