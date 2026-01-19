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
    private readonly IMediaHelper _mediaHelper;  // НОВОЕ
    private readonly AIOptions _options;
    private readonly ILogger<GradingService> _logger;

    public GradingService(
        IGeminiClient gemini,
        IMediaHelper mediaHelper,  // НОВОЕ
        IOptions<AIOptions> options,
        ILogger<GradingService> logger)
    {
        _gemini = gemini;
        _mediaHelper = mediaHelper;  // НОВОЕ
        _options = options.Value;
        _logger = logger;
    }

    public async Task<GradingResponse?> SuggestGradeAsync(
        GradingRequest request,
        CancellationToken ct = default)
    {
        if (!_options.Enabled || !_options.GradingEnabled)
        {
            _logger.LogWarning("AI проверка отключена");
            return null;
        }

        try
        {
            // НОВОЕ: Собираем все MediaIds
            var allMediaIds = new List<Guid>();
            if (request.QuestionMediaIds?.Count > 0)
                allMediaIds.AddRange(request.QuestionMediaIds);
            if (request.AnswerMediaIds?.Count > 0)
                allMediaIds.AddRange(request.AnswerMediaIds);

            // НОВОЕ: Загружаем медиа-файлы параллельно
            var mediaContents = await _mediaHelper.GetMediaContentsAsync(allMediaIds, ct);

            _logger.LogInformation(
                "Проверка ответа: {MediaCount} медиа-файлов загружено",
                mediaContents.Count);

            // Формируем промпт
            var prompt = GradingPrompts.BuildGradingPrompt(
                request.QuestionText,
                request.ExpectedAnswer,
                request.StudentAnswer,
                request.MaxPoints,
                hasMedia: mediaContents.Count > 0 
            );

            // НОВОЕ: Отправляем с медиа
            var response = await _gemini.SendPromptAsync(prompt, mediaContents, ct);

            return ParseGradingResponse(response, request.MaxPoints);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка при AI проверке");
            return null;
        }
    }

    private static GradingResponse ParseGradingResponse(string json, int maxPoints)
    {
        var cleaned = json.Replace("```json", "").Replace("```", "").Trim();
        var data = JsonSerializer.Deserialize<GradingData>(cleaned, 
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (data is null)
            throw new InvalidOperationException("Не удалось распарсить ответ Gemini");

        return new GradingResponse(
            Math.Clamp(data.Points, 0, maxPoints),
            data.Comment,
            Math.Clamp(data.Confidence, 0.0, 1.0));
    }

    private sealed record GradingData(int Points, string Comment, double Confidence);
}