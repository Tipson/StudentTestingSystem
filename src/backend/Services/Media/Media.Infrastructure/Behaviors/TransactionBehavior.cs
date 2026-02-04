using Media.Infrastructure.Data;
using MediatR;

namespace Media.Infrastructure.Behaviors;

/// <summary>
/// Автоматически вызывает SaveChangesAsync после успешного выполнения команды.
/// </summary>
public sealed class TransactionBehavior<TRequest, TResponse>(MediaDbContext dbContext)
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
                        typeof(TRequest).Name.StartsWith("Upload") ||
                        typeof(TRequest).Name.StartsWith("Delete") ||
                        typeof(TRequest).Name.StartsWith("Remove");

        if (!isCommand)
        {
            return await next(cancellationToken);
        }

        var response = await next(cancellationToken);
        
        if (dbContext.ChangeTracker.HasChanges())
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return response;
    }
}
