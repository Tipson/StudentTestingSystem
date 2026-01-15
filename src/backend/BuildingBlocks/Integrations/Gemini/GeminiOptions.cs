namespace BuildingBlocks.Integrations.Gemini;

/// <summary>
/// Конфигурация для Gemini API.
/// </summary>
public sealed class GeminiOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gemini-1.5-flash";
    public double Temperature { get; set; } = 0.3;
    public int MaxOutputTokens { get; set; } = 2048;
}