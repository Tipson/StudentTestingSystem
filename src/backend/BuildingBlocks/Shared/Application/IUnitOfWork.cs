namespace Application;

/// <summary>
/// Базовый интерфейс Unit of Work для управления транзакциями.
/// Используется всеми сервисами для обеспечения атомарности операций с БД.
/// </summary>
public interface IUnitOfWork
{
    /// <summary>
    /// Выполняет действие внутри транзакции с автоматическим Commit/Rollback.
    /// Использует ExecutionStrategy для автоматического retry при временных сбоях.
    /// </summary>
    /// <param name="action">Действие для выполнения внутри транзакции</param>
    /// <param name="ct">Токен отмены</param>
    Task ExecuteAsync(Func<CancellationToken, Task> action, CancellationToken ct);
}
