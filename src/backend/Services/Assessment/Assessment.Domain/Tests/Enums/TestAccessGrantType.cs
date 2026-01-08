namespace Assessment.Domain.Tests.Enums;

/// <summary>
/// Способ предоставления доступа к тесту.
/// </summary>
public enum TestAccessGrantType
{
    /// <summary>
    /// Доступ конкретному пользователю.
    /// </summary>
    User,
    
    /// <summary>
    /// Доступ всей группе.
    /// </summary>
    Group,
    
    /// <summary>
    /// Доступ по ссылке-приглашению.
    /// </summary>
    InviteLink
}