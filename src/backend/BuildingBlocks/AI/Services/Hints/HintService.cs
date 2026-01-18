using System.Text.Json;
using BuildingBlocks.AI.Models;
using BuildingBlocks.AI.Prompts;
using BuildingBlocks.Integrations.Gemini;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BuildingBlocks.AI.Services.Hints;

public sealed class HintService(
    IGeminiClient gemini,
    IOptions<AIOptions> options,
    ILogger<HintService> logger)
    : IAIHintService
{
    private readonly AIOptions _options = options.Value;

    public async Task<HintResponse?> GenerateHintAsync(HintRequest request, CancellationToken ct = default)
    {
        if (!_options.Enabled || !_options.HintsEnabled)
        {
            logger.LogWarning("AI подсказки отключены в конфигурации");
            return null;
        }

        try
        {
            var prompt = HintPrompts.BuildHintPrompt(
                request.QuestionText,
                request.StudentPartialAnswer,
                request.HintLevel);

            var response = await gemini.SendPromptAsync(prompt, ct);
            return ParseHintResponse(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ошибка при генерации AI подсказки");
            return null;
        }
    }

    private static HintResponse ParseHintResponse(string json)
    {
        var cleaned = json.Replace("```json", "").Replace("```", "").Trim();
        var data = JsonSerializer.Deserialize<HintData>(cleaned, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (data is null)
            throw new InvalidOperationException("Не удалось распарсить ответ Gemini");

        return new HintResponse(data.Hint, data.Level);
    }

    private sealed record HintData(string Hint, int Level);
}