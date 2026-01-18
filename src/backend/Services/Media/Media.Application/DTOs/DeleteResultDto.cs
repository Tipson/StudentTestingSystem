namespace Media.Application.DTOs;

/// <summary>
/// Результат удаления файлов.
/// </summary>
public sealed record DeleteResultDto(
    /// <summary>
    /// Количество успешно удалённых файлов.
    /// </summary>
    int DeletedCount,
    
    /// <summary>
    /// ID файлов, которые не удалось удалить (не найдены или нет прав).
    /// </summary>
    List<Guid> FailedIds,
    
    /// <summary>
    /// Детали ошибок по ID.
    /// </summary>
    Dictionary<Guid, string> Errors
);