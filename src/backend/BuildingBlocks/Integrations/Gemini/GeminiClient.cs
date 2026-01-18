using System.Net.Http.Json;
using System.Text.Json;
using BuildingBlocks.Integrations.Gemini.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BuildingBlocks.Integrations.Gemini;

/// <summary>
/// Технический HTTP клиент для работы с Gemini API.
/// Только отправка запросов и получение ответов, без бизнес-логики.
/// </summary>
public interface IGeminiClient
{
    Task<string> SendPromptAsync(string prompt, CancellationToken ct = default);
}

public sealed class GeminiClient(
    HttpClient httpClient,
    IOptions<GeminiOptions> options,
    ILogger<GeminiClient> logger)
    : IGeminiClient
{
    private readonly GeminiOptions _options = options.Value;

    public async Task<string> SendPromptAsync(string prompt, CancellationToken ct = default)
    {
        try
        {
            var request = new GeminiRequest(
                Contents: new[]
                {
                    new Content(Parts: new[] { new Part(Text: prompt) })
                },
                GenerationConfig: new GenerationConfig(
                    Temperature: _options.Temperature,
                    MaxOutputTokens: _options.MaxOutputTokens
                )
            );

            logger.LogDebug("Отправка запроса в Gemini API");

            logger.LogInformation("Gemini request: model={Model}, base={Base}", _options.Model, httpClient.BaseAddress);

            var response = await httpClient.PostAsJsonAsync(
                $"v1beta/models/{_options.Model}:generateContent?key={_options.ApiKey}",
                request,
                ct);

            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<GeminiResponse>(ct);
            var text = result?.Candidates?[0]?.Content?.Parts?[0]?.Text ?? string.Empty;

            logger.LogDebug("Получен ответ от Gemini API: {Length} символов", text.Length);

            return text;
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Ошибка HTTP при вызове Gemini API");
            throw new GeminiApiException("Не удалось подключиться к Gemini API", ex);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Неожиданная ошибка при вызове Gemini API");
            throw new GeminiApiException("Ошибка при работе с Gemini API", ex);
        }
    }
}

/// <summary>
/// Исключение при работе с Gemini API.
/// </summary>
public sealed class GeminiApiException : Exception
{
    public GeminiApiException(string message) : base(message) { }
    public GeminiApiException(string message, Exception innerException) : base(message, innerException) { }
}