using BuildingBlocks.AI.Models;

namespace BuildingBlocks.AI.Services.Generation;

/// <summary>
/// Сервис для AI генерации тестов из документов.
/// </summary>
public interface IAITestGeneratorService
{
    Task<TestGenerationResponse?> GenerateTestAsync(TestGenerationRequest request, CancellationToken ct = default);
}