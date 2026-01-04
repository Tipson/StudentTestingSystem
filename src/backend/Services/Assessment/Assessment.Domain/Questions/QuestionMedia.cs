using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Assessment.Domain.Questions;

[Table("QuestionMedia", Schema = "assessment")]
public sealed class QuestionMedia
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; init; }

    [Required]
    public Guid QuestionId { get; init; }

    /// <summary>
    ///     Идентификатор файла/изображения.
    /// </summary>
    [Required]
    public Guid MediaId { get; init; }

    /// <summary>
    ///     Порядок отображения.
    /// </summary>
    [Range(0, int.MaxValue)]
    public int Order { get; set; }
}