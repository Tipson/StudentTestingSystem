using System.Net.Http.Json;
using BuildingBlocks.Integrations.Gemini.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BuildingBlocks.Integrations.Gemini;

public sealed class GeminiClient(
    HttpClient httpClient,
    IOptions<GeminiOptions> options,
    ILogger<GeminiClient> logger)
    : IGeminiClient
{
    private readonly GeminiOptions _options = options.Value;

    public async Task<string> SendPromptAsync(
        string textPrompt,
        IReadOnlyList<MediaContent> mediaFiles,
        CancellationToken ct = default)
    {
        try
        {
            // Формируем parts
            var parts = new List<Part> 
            { 
                new() { Text = textPrompt } 
            };

            // Добавляем медиа-файлы как InlineData
            foreach (var media in mediaFiles)
            {
                parts.Add(new Part
                {
                    InlineData = new InlineData(
                        MimeType: media.MimeType,
                        Data: media.Base64Content
                    )
                });
            }

            var request = new GeminiRequest(
                Contents:
                [
                    new Content(Parts: parts.ToArray())
                ],
                GenerationConfig: new GenerationConfig(
                    Temperature: _options.Temperature,
                    MaxOutputTokens: _options.MaxOutputTokens
                )
            );

            logger.LogDebug(
                "Отправка мультимодального запроса: текст + {MediaCount} файлов",
                mediaFiles.Count);

            var response = await httpClient.PostAsJsonAsync(
                $"v1beta/models/{_options.Model}:generateContent?key={_options.ApiKey}",
                request,
                ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                logger.LogError("Gemini API error {StatusCode}: {ErrorBody}", 
                    response.StatusCode, errorBody);
            }
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<GeminiResponse>(ct);
            var text = result?.Candidates?[0]?.Content?.Parts?[0]?.Text ?? string.Empty;

            logger.LogDebug("Получен ответ: {Length} символов", text.Length);

            return text;
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "HTTP ошибка при запросе к Gemini");
            throw new GeminiApiException("Не удалось отправить запрос", ex);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ошибка при запросе к Gemini");
            throw new GeminiApiException("Ошибка запроса", ex);
        }
    }
}

public class GeminiApiException : Exception
{
    public GeminiApiException(string message) : base(message) { }
    public GeminiApiException(string message, Exception inner) : base(message, inner) { }
}