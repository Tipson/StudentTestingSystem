using Contracts.Grading.Messages;
using Grading.Application.Services;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Grading.Application.Consumers;

/// <summary>
/// Consumer для обработки запросов на проверку попытки через RabbitMQ.
/// </summary>
public sealed class GradeAttemptConsumer(IGradingOrchestrator orchestrator, 
    ILogger<GradeAttemptConsumer> logger) : IConsumer<GradeAttemptRequest>
{
    public async Task Consume(ConsumeContext<GradeAttemptRequest> context)
    {
        var request = context.Message;
        
        logger.LogInformation(
            "Получен запрос на проверку попытки {AttemptId} через RabbitMQ",
            request.AttemptId);

        try
        {
            var response = await orchestrator.GradeAttemptAsync(request, context.CancellationToken);
            
            // Отправляем ответ обратно
            await context.RespondAsync(response);
            
            logger.LogInformation(
                "Попытка {AttemptId} успешно проверена через RabbitMQ: {EarnedPoints}/{TotalPoints}",
                response.AttemptId, response.EarnedPoints, response.TotalPoints);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Ошибка при проверке попытки {AttemptId} через RabbitMQ",
                request.AttemptId);
            
            // MassTransit автоматически отправит в retry/DLQ
            throw;
        }
    }
}