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
    /// Получает количество использованных попыток для списка тестов одним запросом.
    /// Оптимизация N+1 проблемы - вместо N отдельных запросов делаем один GROUP BY запрос.
    /// </summary>
    /// <param name="testIds">Список ID тестов для подсчета попыток</param>
    /// <param name="userId">ID пользователя</param>
    /// <param name="ct">Токен отмены</param>
    /// <returns>Словарь: TestId -> количество попыток. Если по тесту нет попыток, его не будет в словаре.</returns>
    /// <example>
    /// var counts = await GetAttemptsCountByTestsAsync(new[] { testId1, testId2 }, userId, ct);
    /// var attempts = counts.GetValueOrDefault(testId1, 0); // 0 если попыток нет
    /// </example>
    Task<Dictionary<Guid, int>> GetAttemptsCountByTestsAsync(
        IEnumerable<Guid> testIds, 
        string userId, 
        CancellationToken ct);
    
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
