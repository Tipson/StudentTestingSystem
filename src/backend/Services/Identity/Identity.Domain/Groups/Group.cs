using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Identity.Domain.Groups;

[Table("Groups", Schema = "identity")]
public partial class Group
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; private set; }

    /// <summary>
    /// Код группы: например "РВ-3-1"
    /// </summary>
    [Required]
    [MaxLength(64)]
    public string Code { get; private set; }

    /// <summary>
    /// Учебное заведение
    /// </summary>
    [Required]
    public string Institution { get; private set; }

    /// <summary>
    /// Специализация (РВ, ИС и т.п.)
    /// </summary>
    [Required]
    public string Specialization { get; private set; }

    /// <summary>
    /// Год набора (фиксируется при создании)
    /// </summary>
    [Range(2000, 2100)]
    public int AdmissionYear { get; private set; }

    /// <summary>
    /// Текущий курс
    /// </summary>
    [Range(1, 6)]
    public int Course { get; private set; }

    /// <summary>
    /// Номер группы внутри курса
    /// </summary>
    [Range(1, 100)]
    public int GroupNumber { get; private set; }

    /// <summary>
    /// Активна ли группа
    /// </summary>
    public bool IsActive { get; private set; } = true;

    /// <summary>
    /// Дата создания записи
    /// </summary>
    public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow;

    public Group(string institution, string specialization, int course, int groupNumber)
    {
        if (string.IsNullOrWhiteSpace(institution))
            throw new ArgumentException("Учебное заведение обязательно", nameof(institution));

        if (string.IsNullOrWhiteSpace(specialization))
            throw new ArgumentException("Специализация обязательна", nameof(specialization));

        if (course < 1 || course > 6)
            throw new ArgumentException("Курс должен быть от 1 до 6", nameof(course));

        if (groupNumber < 1)
            throw new ArgumentException("Номер группы должен быть больше 0", nameof(groupNumber));

        Institution = institution.Trim();
        Specialization = specialization.Trim().ToUpperInvariant();
        Course = course;
        GroupNumber = groupNumber;

        AdmissionYear = CalculateAdmissionYear(course);
        Code = $"{Specialization}-{Course}-{GroupNumber}";
        IsActive = true;
        CreatedAt = DateTimeOffset.UtcNow;
    }
}