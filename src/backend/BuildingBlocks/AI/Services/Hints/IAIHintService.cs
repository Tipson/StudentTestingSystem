using BuildingBlocks.AI.Models;

namespace BuildingBlocks.AI.Services.Hints;

/// <summary>
/// Сервис для генерации AI подсказок студентам.
/// </summary>
public interface IAIHintService
{
    Task<HintResponse?> GenerateHintAsync(HintRequest request, CancellationToken ct = default);
}