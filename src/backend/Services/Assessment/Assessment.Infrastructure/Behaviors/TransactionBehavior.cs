using Application;
using MediatR;

namespace Assessment.Infrastructure.Behaviors;

/// <summary>
/// Автоматически вызывает SaveChangesAsync после успешного выполнения команды.
/// Применяется только к командам (IRequest).
/// Использует IUnitOfWork со встроенным resilience от EF Core.
/// </summary>
public sealed class TransactionBehavior<TRequest, TResponse>(IUnitOfWork unitOfWork)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        // Определяем является ли это командой (изменяет данные)
        var isCommand = IsCommand(typeof(TRequest));

        if (!isCommand)
        {
            // Для запросов просто выполняем без SaveChanges
            return await next(cancellationToken);
        }

        // Для команд выполняем с автоматическим SaveChanges (с retry)
        var response = await next(cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return response;
    }

    private static bool IsCommand(Type requestType)
    {
        var name = requestType.Name;
        
        return name.Contains("Command", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("Create", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("Update", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("Delete", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("Set", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("Grant", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("Revoke", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("Publish", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("Unpublish", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("Join", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("Start", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("Submit", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("Save", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("Grade", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("Reorder", StringComparison.OrdinalIgnoreCase);
    }
}