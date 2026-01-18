using System.Text.Json;
using BuildingBlocks.AI.Models;
using BuildingBlocks.AI.Prompts;
using BuildingBlocks.Integrations.Gemini;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BuildingBlocks.AI.Services.Grading;

public sealed class GradingService(
    IGeminiClient gemini,
    IOptions<AIOptions> options,
    ILogger<GradingService> logger)
    : IAIGradingService
{
    private readonly AIOptions _options = options.Value;

    public async Task<GradingResponse?> SuggestGradeAsync(GradingRequest request, CancellationToken ct = default)
    {
        if (!_options.Enabled || !_options.GradingEnabled)
        {
            logger.LogWarning("AI проверка ответов отключена в конфигурации");
            return null;
        }

        try
        {
            var prompt = GradingPrompts.BuildGradingPrompt(
                request.QuestionText,
                request.ExpectedAnswer,
                request.StudentAnswer,
                request.MaxPoints);

            var response = await gemini.SendPromptAsync(prompt, ct);
            return ParseGradingResponse(response, request.MaxPoints);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ошибка при AI проверке ответа");
            return null;
        }
    }

    private static GradingResponse ParseGradingResponse(string json, int maxPoints)
    {
        var cleaned = json.Replace("```json", "").Replace("```", "").Trim();
        var data = JsonSerializer.Deserialize<GradingData>(cleaned, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (data is null)
            throw new InvalidOperationException("Не удалось распарсить ответ Gemini");

        return new GradingResponse(
            Math.Clamp(data.Points, 0, maxPoints),
            data.Comment,
            Math.Clamp(data.Confidence, 0.0, 1.0));
    }

    private sealed record GradingData(int Points, string Comment, double Confidence);
}