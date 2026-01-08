namespace Contracts.Grading.Enums;

/// <summary>
/// Тип проверки ответа.
/// </summary>
public enum GradingType
{
    /// <summary>
    /// Автоматическая проверка (SingleChoice, MultiChoice, ShortText).
    /// </summary>
    Automatic,
    
    /// <summary>
    /// Ручная проверка преподавателем (LongText).
    /// </summary>
    Manual
}