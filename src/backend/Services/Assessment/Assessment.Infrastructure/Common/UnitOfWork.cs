using Application;
using Assessment.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Assessment.Infrastructure.Common;

public sealed class UnitOfWork(AssessmentDbContext db) : IUnitOfWork
{
    /// <summary>
    /// Выполняет действие внутри транзакции с автоматическим Commit/Rollback.
    /// ВАЖНО: ExecutionStrategy несовместим с явными транзакциями - retry не применяется!
    /// </summary>
    public async Task ExecuteAsync(Func<CancellationToken, Task> action, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            await action(ct);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch
        {
            // Явный rollback для ясности (автоматически произойдет при Dispose)
            try
            {
                await tx.RollbackAsync(ct);
            }
            catch
            {
                // Игнорируем ошибки rollback
            }
            throw;
        }
    }
    
    /// <summary>
    /// Сохраняет изменения с автоматическим retry через EF Core ExecutionStrategy.
    /// ВАЖНО: ExecutionStrategy НЕ применяется внутри явных транзакций!
    /// </summary>
    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        // Если мы внутри транзакции - НЕ используем ExecutionStrategy
        if (db.Database.CurrentTransaction is not null)
        {
            return await db.SaveChangesAsync(ct);
        }

        // ExecutionStrategy автоматически обрабатывает transient ошибки
        var strategy = db.Database.CreateExecutionStrategy();
        
        return await strategy.ExecuteAsync(async () => await db.SaveChangesAsync(ct));
    }
}
