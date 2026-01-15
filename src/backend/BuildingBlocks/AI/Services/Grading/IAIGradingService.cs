using BuildingBlocks.AI.Models;

namespace BuildingBlocks.AI.Services.Grading;

/// <summary>
/// Сервис для AI проверки развернутых ответов.
/// </summary>
public interface IAIGradingService
{
    Task<GradingResponse?> SuggestGradeAsync(GradingRequest request, CancellationToken ct = default);
}