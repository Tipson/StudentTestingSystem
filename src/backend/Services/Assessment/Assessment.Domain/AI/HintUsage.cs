using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Assessment.Domain.AI;

/// <summary>
/// История использования AI-подсказок студентом в рамках попытки.
/// Хранит аудит запросов подсказок для контроля лимитов и анализа.
/// </summary>
[Table("HintUsages", Schema = "assessment")]
public class HintUsage
{
    /// <summary>
    /// Уникальный идентификатор записи использования подсказки.
    /// </summary>
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; private set; }

    /// <summary>
    /// Идентификатор попытки прохождения теста, в рамках которой запрошена подсказка.
    /// </summary>
    [Required]
    public Guid AttemptId { get; private set; }

    /// <summary>
    /// Идентификатор вопроса, для которого запрошена подсказка.
    /// </summary>
    [Required]
    public Guid QuestionId { get; private set; }

    /// <summary>
    /// Уровень подсказки (1-3):
    /// 1 - общее направление, намек на тему;
    /// 2 - ключевое слово или концепция;
    /// 3 - почти прямая подсказка, требующая минимального додумывания.
    /// </summary>
    [Required]
    [Range(1, 3)]
    public int HintLevel { get; private set; }

    /// <summary>
    /// Текст подсказки, сгенерированной AI и показанной студенту.
    /// Используется для аудита и анализа качества подсказок.
    /// </summary>
    [Required]
    public string HintText { get; private set; }

    /// <summary>
    /// Дата и время запроса подсказки студентом (UTC).
    /// </summary>
    [Required]
    public DateTimeOffset RequestedAt { get; private set; }

    /// <summary>
    /// Создает новую запись об использовании AI-подсказки.
    /// </summary>
    /// <param name="attemptId">Идентификатор попытки.</param>
    /// <param name="questionId">Идентификатор вопроса.</param>
    /// <param name="hintLevel">Уровень подсказки (1-3).</param>
    /// <param name="hintText">Текст подсказки от AI.</param>
    /// <exception cref="ArgumentException">Если параметры некорректны.</exception>
    public HintUsage(
        Guid attemptId,
        Guid questionId,
        int hintLevel,
        string hintText)
    {
        if (attemptId == Guid.Empty)
            throw new ArgumentException("AttemptId не может быть пустым", nameof(attemptId));

        if (questionId == Guid.Empty)
            throw new ArgumentException("QuestionId не может быть пустым", nameof(questionId));

        if (hintLevel < 1 || hintLevel > 3)
            throw new ArgumentException("HintLevel должен быть от 1 до 3", nameof(hintLevel));

        if (string.IsNullOrWhiteSpace(hintText))
            throw new ArgumentException("HintText не может быть пустым", nameof(hintText));

        Id = Guid.NewGuid();
        AttemptId = attemptId;
        QuestionId = questionId;
        HintLevel = hintLevel;
        HintText = hintText;
        RequestedAt = DateTimeOffset.UtcNow;
    }
}