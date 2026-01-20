namespace BuildingBlocks.Integrations.Gemini;

/// <summary>
/// Конфигурация для Gemini API.
/// </summary>
public sealed class GeminiOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gemini-2.5-flash";
    public double Temperature { get; set; } = 0.3;
    public int MaxOutputTokens { get; set; } = 2048;
    
    /// <summary>
    /// Базовый URL для Gemini API.
    /// По умолчанию: https://generativelanguage.googleapis.com/
    /// Можно использовать для прокси (например, Cloudflare Workers).
    /// </summary>
    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/";
}
