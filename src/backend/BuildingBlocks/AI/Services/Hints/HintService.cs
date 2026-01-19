using BuildingBlocks.AI.Helpers;
using BuildingBlocks.AI.Models;
using BuildingBlocks.AI.Prompts;
using BuildingBlocks.Integrations.Gemini;
using BuildingBlocks.Integrations.Gemini.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BuildingBlocks.AI.Services.Hints;

public sealed class HintService(
    IGeminiClient gemini,
    IMediaHelper mediaHelper,
    IOptions<AIOptions> options,
    ILogger<HintService> logger)
    : IAIHintService
{
    private readonly AIOptions _options = options.Value;

    public async Task<HintResponse?> GenerateHintAsync(
        HintRequest request,
        CancellationToken ct = default)
    {
        if (!_options.Enabled || !_options.HintsEnabled)
        {
            logger.LogWarning("AI подсказки отключены");
            return null;
        }

        try
        {
            // НОВОЕ: Загружаем медиа если есть
            var mediaContents = request.QuestionMediaIds?.Count > 0
                ? await mediaHelper.GetMediaContentsAsync(request.QuestionMediaIds, ct)
                : new List<MediaContent>();

            logger.LogInformation(
                "Генерация подсказки уровня {Level}: {MediaCount} медиа",
                request.HintLevel, mediaContents.Count);

            var prompt = HintPrompts.BuildHintPrompt(
                request.QuestionText,
                request.StudentPartialAnswer,
                request.HintLevel,
                hasMedia: mediaContents.Count > 0
            );

            var response = await gemini.SendPromptAsync(prompt, mediaContents, ct);

            return new HintResponse(response.Trim(), request.HintLevel);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ошибка генерации подсказки");
            return null;
        }
    }
}