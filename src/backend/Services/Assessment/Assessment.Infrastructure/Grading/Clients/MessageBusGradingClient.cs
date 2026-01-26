using Assessment.Application.Interfaces;
using Contracts.Grading.Messages;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Assessment.Infrastructure.Grading.Clients;

/// <summary>
/// Клиент для взаимодействия с Grading Service через Message Bus (RabbitMQ).
/// Автоматическая проверка → RabbitMQ (долгие операции с AI).
/// Ручная проверка → HTTP (быстрая синхронная операция).
/// </summary>
public sealed class MessageBusGradingClient(
    IRequestClient<GradeAttemptRequest> gradeAttemptClient,
    HttpGradingClient httpClient,
    ILogger<MessageBusGradingClient> logger)
    : IGradingClient
{
    public async Task<GradeAttemptResponse> GradeAttemptAsync(GradeAttemptRequest request, CancellationToken ct = default)
    {
        logger.LogInformation(
            "Отправка запроса на проверку попытки {AttemptId} через Message Bus",
            request.AttemptId);

        try
        {
            var response = await gradeAttemptClient.GetResponse<GradeAttemptResponse>(
                request,
                ct,
                RequestTimeout.After(m: 2));
            
            logger.LogInformation(
                "Попытка {AttemptId} успешно проверена через Message Bus: {EarnedPoints}/{TotalPoints}",
                response.Message.AttemptId,
                response.Message.EarnedPoints,
                response.Message.TotalPoints);
            
            return response.Message;
        }
        catch (RequestTimeoutException ex)
        {
            logger.LogError(ex,
                "Timeout при проверке попытки {AttemptId} через Message Bus",
                request.AttemptId);
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Ошибка при проверке попытки {AttemptId} через Message Bus",
                request.AttemptId);
            throw;
        }
    }

    /// <summary>
    /// Ручная проверка всегда через HTTP (быстрая синхронная операция).
    /// </summary>
    public async Task<ManualGradeResponse> GradeAnswerManuallyAsync(
        ManualGradeRequest request,
        CancellationToken ct = default)
    {
        logger.LogDebug(
            "Ручная проверка делегируется в HTTP клиент (быстрая операция)");
        
        return await httpClient.GradeAnswerManuallyAsync(request, ct);
    }
}