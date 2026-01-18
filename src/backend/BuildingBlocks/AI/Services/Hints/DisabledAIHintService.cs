using BuildingBlocks.AI.Models;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.AI.Services.Hints;

/// <summary>
/// Заглушка для отключенного AI.
/// </summary>
public sealed class DisabledAIHintService(ILogger<DisabledAIHintService> logger) : IAIHintService
{
    public Task<HintResponse?> GenerateHintAsync(HintRequest request, CancellationToken ct = default)
    {
        logger.LogDebug("AI подсказки отключены, возвращаем null");
        return Task.FromResult<HintResponse?>(null);
    }
}