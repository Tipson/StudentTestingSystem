using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Assessment.Domain.Questions;

/// <summary>
///     Медиа, прикреплённые к варианту ответа.
/// </summary>
[Table("QuestionOptionMedia", Schema = "assessment")]
public sealed class QuestionOptionMedia
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; init; }

    [Required]
    public Guid QuestionOptionId { get; init; }

    [Required]
    public Guid MediaId { get; set; }

    [Range(0, int.MaxValue)]
    public int Order { get; set; }
}