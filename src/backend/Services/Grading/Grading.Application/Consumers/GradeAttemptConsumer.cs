using Contracts.Grading.Messages;
using Grading.Application.CQRS.Commands;
using MassTransit;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Grading.Application.Consumers;

/// <summary>
/// Consumer для обработки запросов на проверку попытки через RabbitMQ.
/// </summary>
public sealed class GradeAttemptConsumer(
    IMediator mediator,
    ILogger<GradeAttemptConsumer> logger) 
    : IConsumer<GradeAttemptRequest>
{
    public async Task Consume(ConsumeContext<GradeAttemptRequest> context)
    {
        var request = context.Message;
        
        logger.LogInformation(
            "Получен запрос на проверку попытки {AttemptId} через RabbitMQ",
            request.AttemptId);

        try
        {
            var response = await mediator.Send(new GradeAttempt(request), context.CancellationToken);
            
            await context.RespondAsync(response);
            
            logger.LogInformation(
                "Попытка {AttemptId} успешно проверена: {EarnedPoints}/{TotalPoints} баллов",
                response.AttemptId, response.EarnedPoints, response.TotalPoints);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Ошибка при проверке попытки {AttemptId}",
                request.AttemptId);
            
            throw;
        }
    }
}
