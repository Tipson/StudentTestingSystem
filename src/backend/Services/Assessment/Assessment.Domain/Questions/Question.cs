using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Assessment.Domain.Questions;

/// <summary>
///     Вопрос теста.
/// </summary>
[Table("Questions", Schema = "assessment")]
public partial class Question
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; private set; }

    [Required] public Guid TestId { get; private set; }

    /// <summary>
    ///     Порядок отображения вопроса в тесте.
    /// </summary>
    [Range(1, int.MaxValue)]
    public int Order { get; set; }

    /// <summary>
    ///     Тип вопроса.
    /// </summary>
    [Required]
    public QuestionType Type { get; set; }

    /// <summary>
    ///     Текст вопроса.
    /// </summary>
    [Required]
    [MaxLength(4000)]
    public string Text { get; set; }

    /// <summary>
    ///     Является ли вопрос обязательным.
    /// </summary>
    public bool IsRequired { get; set; } = true;

    /// <summary>
    ///     Количество баллов за вопрос.
    /// </summary>
    [Range(0, 1000)]
    public int Points { get; set; } = 1;

    /// <summary>
    ///     Медиа, прикреплённые к вопросу.
    /// </summary>
    public IList<QuestionMedia> Media { get; init; } = new List<QuestionMedia>();

    /// <summary>
    ///     Варианты ответа для вопроса.
    /// </summary>
    public IList<QuestionOption> Options { get; init; } = new List<QuestionOption>();

    public Question(
        Guid testId,
        string text,
        QuestionType type,
        int order,
        bool isRequired = true,
        int points = 1)
    {
        if (testId == Guid.Empty)
            throw new ArgumentException("TestId не может быть пустым", nameof(testId));

        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("Текст вопроса не может быть пустым", nameof(text));

        ArgumentOutOfRangeException.ThrowIfLessThan(order, 1);

        ArgumentOutOfRangeException.ThrowIfNegative(points);

        TestId = testId;
        Text = text.Trim();
        Type = type;
        Order = order;
        IsRequired = isRequired;
        Points = points;
    }
}