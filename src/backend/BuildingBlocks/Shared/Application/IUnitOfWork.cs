namespace Application;

/// <summary>
/// Базовый интерфейс Unit of Work для управления транзакциями.
/// Используется всеми сервисами для обеспечения атомарности операций с БД.
/// </summary>
public interface IUnitOfWork
{
    /// <summary>
    /// Выполняет действие внутри транзакции с автоматическим Commit/Rollback.
    /// ВАЖНО: ExecutionStrategy не используется внутри явных транзакций (retry не применяется).
    /// Для retry используйте SaveChangesAsync без явных транзакций.
    /// </summary>
    /// <param name="action">Действие для выполнения внутри транзакции</param>
    /// <param name="ct">Токен отмены</param>
    Task ExecuteAsync(Func<CancellationToken, Task> action, CancellationToken ct);
    
    /// <summary>
    /// Сохраняет изменения в БД с автоматическим retry при временных сбоях.
    /// Использует ExecutionStrategy от EF Core (только вне явных транзакций).
    /// </summary>
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
