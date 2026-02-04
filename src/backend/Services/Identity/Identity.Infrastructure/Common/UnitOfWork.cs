using Application;
using Identity.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Common;

public sealed class UnitOfWork(IdentityDbContext db) : IUnitOfWork
{
    /// <summary>
    /// Сохраняет изменения с автоматическим retry через EF Core ExecutionStrategy
    /// </summary>
    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        var strategy = db.Database.CreateExecutionStrategy();
        
        return await strategy.ExecuteAsync(async () => await db.SaveChangesAsync(ct));
    }

    /// <summary>
    /// Выполняет действие внутри транзакции с retry
    /// </summary>
    public async Task ExecuteAsync(Func<CancellationToken, Task> action, CancellationToken ct)
    {
        var strategy = db.Database.CreateExecutionStrategy();

        await strategy.ExecuteAsync(async () =>
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
                await tx.RollbackAsync(ct);
                throw;
            }
        });
    }
}