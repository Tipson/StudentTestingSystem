using Identity.Infrastructure.Data;
using MediatR;

namespace Identity.Infrastructure.Behaviors;

/// <summary>
/// Автоматически вызывает SaveChangesAsync после успешного выполнения команды.
/// </summary>
public sealed class TransactionBehavior<TRequest, TResponse>(IdentityDbContext dbContext)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        // Определяем является ли это командой (изменяет данные)
        var isCommand = typeof(TRequest).Name.Contains("Command") ||
                        typeof(TRequest).Name.StartsWith("Create") ||
                        typeof(TRequest).Name.StartsWith("Update") ||
                        typeof(TRequest).Name.StartsWith("Delete") ||
                        typeof(TRequest).Name.StartsWith("Set") ||
                        typeof(TRequest).Name.StartsWith("Add") ||
                        typeof(TRequest).Name.StartsWith("Remove") ||
                        typeof(TRequest).Name.StartsWith("Assign") ||
                        typeof(TRequest).Name.StartsWith("Unassign") ||
                        typeof(TRequest).Name.StartsWith("Deactivate") ||
                        typeof(TRequest).Name.StartsWith("Activate");

        if (!isCommand)
        {
            return await next();
        }

        var response = await next();
        
        if (dbContext.ChangeTracker.HasChanges())
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return response;
    }
}
