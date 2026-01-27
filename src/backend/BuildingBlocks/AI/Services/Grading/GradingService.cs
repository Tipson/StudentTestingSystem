using BuildingBlocks.AI.Helpers;
using BuildingBlocks.AI.Models;
using BuildingBlocks.AI.Prompts;
using BuildingBlocks.Integrations.Gemini;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace BuildingBlocks.AI.Services.Grading;

public sealed class GradingService : IAIGradingService
{
    private readonly IGeminiClient _gemini;
    private readonly IMediaHelper _mediaHelper;
    private readonly AIOptions _options;
    private readonly ILogger<GradingService> _logger;

    public GradingService(
        IGeminiClient gemini,
        IMediaHelper mediaHelper,
        IOptions<AIOptions> options,
        ILogger<GradingService> logger)
    {
        _gemini = gemini;
        _mediaHelper = mediaHelper;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<GradingResponse?> SuggestGradeAsync(
        GradingRequest request,
        CancellationToken ct = default)
    {
        if (!_options.Enabled || !_options.GradingEnabled)
        {
            _logger.LogWarning("AI проверка отключена в конфигурации");
            return null;
        }

        try
        {
            var allMediaIds = new List<Guid>();
            if (request.QuestionMediaIds?.Count > 0)
                allMediaIds.AddRange(request.QuestionMediaIds);
            if (request.AnswerMediaIds?.Count > 0)
                allMediaIds.AddRange(request.AnswerMediaIds);

            var mediaContents = await _mediaHelper.GetMediaContentsAsync(allMediaIds, ct);

            _logger.LogInformation(
                "Начата AI проверка ответа с {MediaCount} медиа-файлами",
                mediaContents.Count);

            var prompt = GradingPrompts.BuildGradingPrompt(
                request.QuestionText,
                request.ExpectedAnswer,
                request.StudentAnswer,
                request.MaxPoints,
                hasMedia: mediaContents.Count > 0 
            );

            var response = await _gemini.SendPromptAsync(prompt, mediaContents, ct);

            var result = ParseGradingResponse(response, request.MaxPoints);
            
            _logger.LogInformation(
                "AI проверка завершена: {Points}/{MaxPoints} баллов, уверенность {Confidence:P0}",
                result.Points, request.MaxPoints, result.Confidence);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка при выполнении AI проверки ответа");
            return null;
        }
    }

    private static GradingResponse ParseGradingResponse(string json, int maxPoints)
    {
        var cleaned = json.Replace("```json", "").Replace("```", "").Trim();
        var data = JsonSerializer.Deserialize<GradingData>(cleaned, 
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (data is null)
            throw new InvalidOperationException("Не удалось распарсить ответ AI");

        return new GradingResponse(
            Math.Clamp(data.Points, 0, maxPoints),
            data.Comment,
            Math.Clamp(data.Confidence, 0.0, 1.0));
    }

    private sealed record GradingData(int Points, string Comment, double Confidence);
}
