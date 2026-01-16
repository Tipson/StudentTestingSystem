using Contracts.Grading.Messages;

namespace Grading.Application.Services;

/// <summary>
/// Оркестратор для проверки попыток.
/// Координирует процесс проверки всех ответов.
/// </summary>
public interface IGradingOrchestrator
{
    Task<GradeAttemptResponse> GradeAttemptAsync(GradeAttemptRequest request, CancellationToken ct = default);
}