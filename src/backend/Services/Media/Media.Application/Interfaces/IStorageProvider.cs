namespace Media.Application.Interfaces;

/// <summary>
/// Провайдер хранилища (MinIO).
/// </summary>
public interface IStorageProvider
{
    /// <summary>
    ///     Получает файл из хранилища как поток по его абсолютному пути.
    /// </summary>
    /// <param name="absolutePath">Полный путь к объекту внутри bucket'а, например: <c>raids/1/screenshots/image.png</c>.</param>
    /// <param name="bucket">Имя bucket'а (если <c>null</c>, используется значение по умолчанию из конфигурации).</param>
    /// <returns>Поток с содержимым файла.</returns>
    Task<Stream> GetAsync(string absolutePath, string? bucket = null);

    /// <summary>
    ///     Загружает файл в хранилище по указанному пути и имени.
    /// </summary>
    /// <param name="contentType">MIME-тип содержимого (например, <c>image/png</c>).</param>
    /// <param name="bucket">Имя bucket'а (если <c>null</c>, используется значение по умолчанию из конфигурации).</param>
    Task UploadAsync(Stream stream, string objectKey, string contentType, long sizeBytes, string? bucket = null);

    /// <summary>
    ///     Удаляет файл из хранилища по его абсолютному пути.
    /// </summary>
    /// <param name="absolutePath">Полный путь к объекту внутри bucket'а, например: <c>raids/1/screenshots/image.png</c>.</param>
    /// <param name="bucket">Имя bucket'а (если <c>null</c>, используется значение по умолчанию из конфигурации).</param>
    Task DeleteAsync(string absolutePath, string? bucket = null);
}