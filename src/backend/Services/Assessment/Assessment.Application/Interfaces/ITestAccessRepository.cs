using Assessment.Domain.Tests;

namespace Assessment.Application.Interfaces;

/// <summary>
/// Репозиторий для работы с доступами к тестам.
/// </summary>
public interface ITestAccessRepository
{
    /// <summary>
    /// Получить доступ по ID.
    /// </summary>
    Task<TestAccess?> GetByIdAsync(Guid id, CancellationToken ct);
    
    /// <summary>
    /// Получить доступ по коду приглашения.
    /// </summary>
    Task<TestAccess?> GetByInviteCodeAsync(Guid inviteCode, CancellationToken ct);
    
    /// <summary>
    /// Получить все доступы для конкретного теста.
    /// </summary>
    Task<List<TestAccess>> GetByTestIdAsync(Guid testId, CancellationToken ct);
    
    /// <summary>
    /// Получить все активные доступы для пользователя.
    /// </summary>
    Task<List<TestAccess>> GetByUserIdAsync(string userId, CancellationToken ct);
    
    /// <summary>
    /// Получить все активные доступы для группы.
    /// </summary>
    Task<List<TestAccess>> GetByGroupIdAsync(Guid groupId, CancellationToken ct);
    
    /// <summary>
    /// Получить доступ пользователя к конкретному тесту.
    /// </summary>
    Task<TestAccess?> GetByTestAndUserAsync(Guid testId, string userId, CancellationToken ct);
    
    /// <summary>
    /// Получить доступ группы к конкретному тесту.
    /// </summary>
    Task<TestAccess?> GetByTestAndGroupAsync(Guid testId, Guid groupId, CancellationToken ct);
    
    /// <summary>
    /// Добавить новый доступ.
    /// </summary>
    Task AddAsync(TestAccess access, CancellationToken ct);
    
    /// <summary>
    /// Обновить доступ.
    /// </summary>
    Task UpdateAsync(TestAccess access, CancellationToken ct);
    
    /// <summary>
    /// Удалить доступ.
    /// </summary>
    Task DeleteAsync(TestAccess access, CancellationToken ct);
}