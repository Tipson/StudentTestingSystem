using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Assessment.Domain.Questions;
using Assessment.Domain.Tests.Enums;
using Contracts.Assessment.Enums;

namespace Assessment.Domain.Tests;

/// <summary>
///     Представляет тест (оценочное задание),
///     содержащий настройки прохождения и принадлежность преподавателю.
/// </summary>
[Table("Tests", Schema = "assessment")]
public partial class Test
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; private set; }

    /// <summary>
    ///     Название теста.
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string Title { get; set; }

    /// <summary>
    ///     Описание теста.
    /// </summary>
    [MaxLength(2000)]
    public string? Description { get; set; }

    /// <summary>
    ///     Идентификатор пользователя (преподавателя), создавшего тест.
    /// </summary>
    [Required]
    [MaxLength(64)]
    public string OwnerUserId { get; private set; }

    /// <summary>
    ///     Статус теста.
    /// </summary>
    [Required]
    public TestStatus Status { get; set; } = TestStatus.Draft;

    /// <summary>
    ///     Ограничение по времени в секундах.
    ///     null — без ограничения.
    /// </summary>
    public int? TimeLimitSeconds { get; set; }

    /// <summary>
    ///     Проходной балл (в процентах).
    /// </summary>
    [Range(0, 100)]
    public int PassScore { get; set; }

    /// <summary>
    ///     Максимальное количество попыток прохождения теста.
    /// </summary>
    [Range(1, 20)]
    public int AttemptsLimit { get; set; } = 1;

    /// <summary>
    ///     Дата и время создания теста.
    /// </summary>
    public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAt { get; private set; } = null;

    /// <summary>
    ///     Дата и время публикации теста.
    /// </summary>
    public DateTimeOffset? PublishedAt { get; set; }
    
    /// <summary>
    ///     Тип доступа (Приватный или Публичный).
    /// </summary>
    public TestAccessType AccessType { get; private set; } = TestAccessType.Private;
    
    // Время жизни теста
    public DateTimeOffset? AvailableFrom { get; private set; }
    public DateTimeOffset? AvailableUntil { get; private set; }

    public IList<Question> Questions { get; init; } = new List<Question>();
    
    public Test(string ownerUserId, string title, string? description = null)
    {
        if (string.IsNullOrWhiteSpace(ownerUserId))
            throw new ArgumentException("OwnerId обязателен.", nameof(ownerUserId));

        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title обязателен.", nameof(title));

        OwnerUserId = ownerUserId;
        Title = title.Trim();
        Description = description?.Trim();

        Status = TestStatus.Draft;
        CreatedAt = DateTimeOffset.UtcNow;
        AttemptsLimit = 1;
        PassScore = 0;
    }
}
