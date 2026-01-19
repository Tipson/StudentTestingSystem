using BuildingBlocks.AI.Helpers;
using BuildingBlocks.AI.Models;
using BuildingBlocks.AI.Prompts;
using BuildingBlocks.Integrations.Gemini;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text.Json;
using BuildingBlocks.Integrations.Gemini.Models;

namespace BuildingBlocks.AI.Services.Generation;

public sealed class TestGeneratorService(
    IGeminiClient gemini,
    IMediaHelper mediaHelper,
    IOptions<AIOptions> options,
    ILogger<TestGeneratorService> logger)
    : IAITestGeneratorService
{
    private readonly AIOptions _options = options.Value;

    public async Task<TestGenerationResponse?> GenerateTestAsync(
        TestGenerationRequest request,
        CancellationToken ct = default)
    {
        if (!_options.Enabled || !_options.TestGenerationEnabled)
        {
            logger.LogWarning("AI генерация тестов отключена");
            return null;
        }

        try
        {
            var mediaContents = new List<MediaContent>();

            // НОВОЕ: Если указан документ - загружаем его
            if (request.DocumentMediaId.HasValue)
            {
                logger.LogInformation(
                    "Генерация теста из документа {MediaId}",
                    request.DocumentMediaId.Value);

                var mediaContent = await mediaHelper.GetMediaContentAsync(
                    request.DocumentMediaId.Value, ct);

                if (mediaContent != null)
                {
                    mediaContents.Add(mediaContent);
                    logger.LogInformation("Документ загружен для генерации теста");
                }
                else
                {
                    throw new InvalidOperationException(
                        $"Документ {request.DocumentMediaId.Value} не найден");
                }
            }
            else if (string.IsNullOrWhiteSpace(request.DocumentText))
            {
                throw new InvalidOperationException(
                    "Не указан ни документ, ни текст для генерации теста");
            }

            var prompt = TestGenerationPrompts.BuildTestGenerationPrompt(
                request.DocumentText,
                request.QuestionsCount,
                request.Topic,
                request.Mode
            );

            // Отправляем в Gemini (с документом или без)
            var response = await gemini.SendPromptAsync(prompt, mediaContents, ct);

            return ParseTestGenerationResponse(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ошибка при AI генерации теста");
            return null;
        }
    }

    private static TestGenerationResponse ParseTestGenerationResponse(string json)
    {
        var cleaned = json.Replace("```json", "").Replace("```", "").Trim();
        
        var data = JsonSerializer.Deserialize<TestGenerationResponse>(cleaned,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (data is null)
            throw new InvalidOperationException("Не удалось распарсить ответ Gemini");

        return data;
    }
}