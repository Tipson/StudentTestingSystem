using Assessment.Domain.Attempts;

namespace Assessment.Application.Interfaces;

public interface IAttemptRepository
{
    Task<Attempt?> GetByIdAsync(Guid id, CancellationToken ct);
    
    /// <summary>
    /// Получить попытку с ответами.
    /// </summary>
    Task<Attempt?> GetWithAnswersAsync(Guid id, CancellationToken ct);
    
    /// <summary>
    /// Количество попыток пользователя по тесту.
    /// </summary>
    Task<int> CountByUserAndTestAsync(string userId, Guid testId, CancellationToken ct);
    
    /// <summary>
    /// Активная (незавершённая) попытка пользователя.
    /// </summary>
    Task<Attempt?> GetActiveAsync(string userId, Guid testId, CancellationToken ct);
    
    /// <summary>
    /// Все попытки пользователя по тесту.
    /// </summary>
    Task<List<Attempt>> ListByUserAndTestAsync(string userId, Guid testId, CancellationToken ct);
    
    /// <summary>
    /// Все попытки пользователя.
    /// </summary>
    Task<List<Attempt>> ListByUserAsync(string userId, CancellationToken ct);
    
    /// <summary>
    /// Все попытки по тесту (для преподавателя).
    /// </summary>
    Task<List<Attempt>> ListByTestAsync(Guid testId, CancellationToken ct);
    
    Task AddAsync(Attempt attempt, CancellationToken ct);
    Task UpdateAsync(Attempt attempt, CancellationToken ct);
}