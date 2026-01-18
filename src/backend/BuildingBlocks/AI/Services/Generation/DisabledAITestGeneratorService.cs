using BuildingBlocks.AI.Models;
using BuildingBlocks.AI.Services.Hints;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.AI.Services.Generation;

/// <summary>
/// Заглушка для отключенной AI генерации тестов.
/// </summary>
public sealed class DisabledAITestGeneratorService(ILogger<DisabledAITestGeneratorService> logger) : IAITestGeneratorService
{
    public Task<TestGenerationResponse?> GenerateTestAsync(TestGenerationRequest request, CancellationToken ct = default)
    {
        logger.LogDebug("AI генерация тестов отключена, возвращаем null");
        return Task.FromResult<TestGenerationResponse?>(null);
    }
}