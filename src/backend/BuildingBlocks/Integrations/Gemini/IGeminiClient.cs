using BuildingBlocks.Integrations.Gemini.Models;

namespace BuildingBlocks.Integrations.Gemini;

/// <summary>
/// Технический HTTP клиент для работы с Gemini API.
/// Только отправка запросов и получение ответов, без бизнес-логики.
/// </summary>
public interface IGeminiClient
{
    /// <summary>
    /// Отправка промпта (с медиа или без).
    /// </summary>
    Task<string> SendPromptAsync(
        string textPrompt,
        IReadOnlyList<MediaContent> mediaFiles,
        CancellationToken ct = default);
}