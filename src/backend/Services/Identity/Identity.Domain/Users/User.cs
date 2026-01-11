using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Contracts.Identity;
using Identity.Domain.Groups;

namespace Identity.Domain.Users;

/// <summary>
///     Пользователь системы.
///     Представляет локальный профиль пользователя,
///     связанный с внешней системой аутентификации.
/// </summary>
[Table("Users", Schema = "identity")]
public partial class User
{
    [Key]
    [Required]
    [MaxLength(64)]
    public string Id { get; private set; } = default!;
    
    [EmailAddress]
    [MaxLength(320)]
    public string? Email { get; private set; }
    
    [MaxLength(200)]
    public string? FullName { get; private set; }

    /// <summary>
    ///     Идентификатор пользователя в Telegram.
    /// </summary>
    public long? TelegramId { get; private set; }
    
    [Required]
    public UserRole Role { get; private set; } = UserRole.Student;
    public Guid? GroupId { get; private set; }
    
    public bool IsActive { get; private set; } = true;
    
    public Group? Group { get; private set; }
    
    [Required]
    public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow;
    
    public User(string id, string? email)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("Идентификатор пользователя обязателен.", nameof(id));

        Id = id;
        Email = NormalizeEmail(email);
    }
}
