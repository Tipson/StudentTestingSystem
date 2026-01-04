using Assessment.Domain.Tests;

namespace Assessment.Application.Interfaces;

/// <summary>
/// Репозиторий для работы с тестами.
/// </summary>
public interface ITestRepository
{
    /// <summary>
    /// Возвращает тест по идентификатору.
    /// </summary>
    Task<Test?> GetByIdAsync(Guid id, CancellationToken ct);

    /// <summary>
    /// Возвращает список тестов, принадлежащих пользователю.
    /// </summary>
    Task<List<Test>> ListByOwnerAsync(string ownerId, CancellationToken ct);

    /// <summary>
    /// Добавляет новый тест в хранилище.
    /// </summary>
    Task AddAsync(Test test, CancellationToken ct);

    Task UpdateAsync(Test test, CancellationToken ct);
    
    Task DeleteAsync(Test test, CancellationToken ct);
}