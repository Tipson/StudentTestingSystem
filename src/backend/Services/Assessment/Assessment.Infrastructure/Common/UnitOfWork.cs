using Application;
using Assessment.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Assessment.Infrastructure.Common;

public sealed class UnitOfWork(AssessmentDbContext db) : IUnitOfWork
{
    /// <summary>
    /// Выполняет действие внутри транзакции.
    /// TransactionBehavior уже вызовет SaveChanges, поэтому просто оборачиваем в транзакцию.
    /// </summary>
    public async Task ExecuteAsync(Func<CancellationToken, Task> action, CancellationToken ct)
    {
        // ВАЖНО: ExecutionStrategy несовместим с явными транзакциями!
        // Поэтому используем простую транзакцию без retry
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            await action(ct);
            // SaveChanges будет вызван автоматически через TransactionBehavior
            // Но если нужна явная транзакция - вызываем вручную
            if (db.ChangeTracker.HasChanges())
            {
                await db.SaveChangesAsync(ct);
            }
            await tx.CommitAsync(ct);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }
    
    /// <summary>
    /// Сохраняет изменения с автоматическим retry через EF Core ExecutionStrategy
    /// </summary>
    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        // ExecutionStrategy автоматически обрабатывает transient ошибки
        var strategy = db.Database.CreateExecutionStrategy();
        
        return await strategy.ExecuteAsync(async () => await db.SaveChangesAsync(ct));
    }
}
