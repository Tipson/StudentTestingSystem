using Contracts.Grading.Messages;

namespace Assessment.Application.Interfaces;

/// <summary>
/// Клиент для взаимодействия с Grading Service.
/// </summary>
public interface IGradingClient
{
    /// <summary>
    /// Отправить запрос на проверку попытки.
    /// </summary>
    Task<GradeAttemptResponse> GradeAttemptAsync(
        GradeAttemptRequest request,
        CancellationToken ct = default);
}