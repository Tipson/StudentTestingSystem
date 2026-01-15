namespace BuildingBlocks.AI;

/// <summary>
/// Настройки AI функционала.
/// Позволяет включать/отключать AI функции через конфигурацию.
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
}