using Contracts.Identity;

namespace Identity.Domain.Users;

public partial class User 
{
    /// <summary>
    ///     Устанавливает роль пользователя.
    /// </summary>
    public void SetRole(UserRole role) => Role = role;

    /// <summary>
    ///     Устанавливает электронную почту пользователя.
    /// </summary>
    public void SetEmail(string? email) => Email = NormalizeEmail(email);

    /// <summary>
    ///     Устанавливает полное имя пользователя.
    /// </summary>
    public void SetFullName(string? fullName) => FullName = NormalizeText(fullName);

    /// <summary>
    ///     Привязывает Telegram-аккаунт к пользователю.
    /// </summary>
    public void LinkTelegram(long telegramId)
    {
        if (telegramId <= 0)
            throw new ArgumentException("Идентификатор Telegram должен быть положительным числом.", nameof(telegramId));

        TelegramId = telegramId;
    }

    /// <summary>
    ///     Отвязывает Telegram-аккаунт от пользователя.
    /// </summary>
    public void UnlinkTelegram() => TelegramId = null;

    /// <summary>
    ///     Деактивирует пользователя.
    /// </summary>
    public void Deactivate() => IsActive = false;

    /// <summary>
    ///     Активирует пользователя.
    /// </summary>
    public void Activate() => IsActive = true;

    /// <summary>
    ///     Применяет данные из внешней системы аутентификации.
    ///     Возвращает true, если данные были изменены.
    /// </summary>
    public bool ApplyIdentity(string? email, string? fullName, UserRole role)
    {
        var changed = false;

        var normalizedEmail = NormalizeEmail(email);
        if (!StringEqualsIgnoreCase(Email, normalizedEmail))
        {
            Email = normalizedEmail;
            changed = true;
        }

        var normalizedFullName = NormalizeText(fullName);
        if (!string.Equals(FullName, normalizedFullName, StringComparison.Ordinal))
        {
            FullName = normalizedFullName;
            changed = true;
        }

        if (Role != role)
        {
            Role = role;
            changed = true;
        }

        return changed;
    }

    private static string? NormalizeEmail(string? email)
    {
        email = NormalizeText(email);
        return string.IsNullOrWhiteSpace(email) ? null : email;
    }

    private static string? NormalizeText(string? value)
    {
        value = value?.Trim();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static bool StringEqualsIgnoreCase(string? a, string? b) =>
        string.Equals(a, b, StringComparison.OrdinalIgnoreCase);
    
    public void SetGroupId(Guid? groupId)       // +
    {
        GroupId = groupId;
    }
}