namespace Assessment.Domain.Tests.Enums;

/// <summary>
/// Тип доступа к тесту.
/// </summary>
public enum TestAccessType
{
    /// <summary>
    /// Публичный — видят все студенты.
    /// </summary>
    Public,
    
    /// <summary>
    /// Приватный — только с явным доступом.
    /// </summary>
    Private
}