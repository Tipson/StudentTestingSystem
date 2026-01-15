using BuildingBlocks.AI.Models;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.AI.Services.Grading;

/// <summary>
/// Заглушка для отключенной AI проверки.
/// </summary>
public sealed class DisabledAIGradingService(ILogger<DisabledAIGradingService> logger) : IAIGradingService
{
    public Task<GradingResponse?> SuggestGradeAsync(GradingRequest request, CancellationToken ct = default)
    {
        logger.LogDebug("AI проверка отключена, возвращаем null");
        return Task.FromResult<GradingResponse?>(null);
    }
}