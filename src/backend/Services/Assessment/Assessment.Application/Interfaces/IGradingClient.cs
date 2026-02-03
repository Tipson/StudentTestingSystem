using Contracts.Grading.Messages;

namespace Assessment.Application.Interfaces;

/// <summary>
/// Клиент для взаимодействия с Grading Service.
/// </summary>
public interface IGradingClient
{
    /// <summary>
    /// Автоматически проверяет всю попытку.
    /// </summary>
    Task<GradeAttemptResponse> GradeAttemptAsync(
        GradeAttemptRequest request,
        CancellationToken ct = default);
    
    /// <summary>
    /// Вручную проверяет один ответ.
    /// </summary>
    Task<ManualGradeResponse> GradeAnswerManuallyAsync(
        ManualGradeRequest request,
        CancellationToken ct = default);
}