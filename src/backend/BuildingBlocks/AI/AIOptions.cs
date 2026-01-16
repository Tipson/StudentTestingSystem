namespace BuildingBlocks.AI;

/// <summary>
/// Настройки AI функционала.
/// </summary>
public sealed class AIOptions
{
    /// <summary>
    /// Включен ли AI вообще.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Включены ли AI подсказки для студентов.
    /// </summary>
    public bool HintsEnabled { get; set; } = true;

    /// <summary>
    /// Включена ли AI проверка развернутых ответов.
    /// </summary>
    public bool GradingEnabled { get; set; } = true;

    /// <summary>
    /// Включена ли AI генерация тестов из документов.
    /// </summary>
    public bool TestGenerationEnabled { get; set; } = true;
    
    /// <summary>
    /// Минимальная уверенность AI для автоматической оценки (0.0 - 1.0).
    /// Если AI менее уверен, требуется ручная проверка.
    /// </summary>
    public double MinimumConfidenceThreshold { get; set; } = 0.7;
}