namespace Media.Application.Interfaces;

/// <summary>
/// Провайдер хранилища (MinIO).
/// </summary>
public interface IStorageProvider
{
    /// <summary>
    ///     Генерирует временную подписанную ссылку для прямого доступа к файлу.
    /// </summary>
    /// <param name="path">Путь к объекту внутри bucket'а, например: <c>general/1/image.png</c>.</param>
    /// <param name="expiry">Время жизни ссылки.</param>
    /// <param name="bucket">Имя bucket'а (если <c>null</c>, используется значение по умолчанию из конфигурации).</param>
    /// <returns>Подписанный URL для прямого доступа к файлу.</returns>
    Task<string> GetPresignedUrlAsync(string path, TimeSpan expiry, string? bucket = null);
    
    /// <summary>
    ///     Получает файл из хранилища как поток по его абсолютному пути.
    /// </summary>
    /// <param name="absolutePath">Полный путь к объекту внутри bucket'а, например: <c>raids/1/screenshots/image.png</c>.</param>
    /// <param name="bucket">Имя bucket'а (если <c>null</c>, используется значение по умолчанию из конфигурации).</param>
    /// <returns>Поток с содержимым файла.</returns>
    Task<Stream> GetAsync(string absolutePath, string? bucket = null);

    /// <summary>
    ///     Скопировать файл из хранилища в указанный поток назначения.
    /// </summary>
    /// <param name="path">Полный путь к объекту внутри bucket'а, например: <c>raids/1/screenshots/image.png</c>.</param>
    /// <param name="destination">Поток назначения, в который будет записано содержимое файла.</param>
    /// <param name="bucket">Имя bucket'а (если <c>null</c>, используется значение по умолчанию из конфигурации).</param>
    /// <param name="ct">Токен отмены операции.</param>
    /// <returns>Задача, завершающаяся после полной передачи файла в поток назначения.</returns>
    Task CopyToAsync(string path, Stream destination, string? bucket = null, CancellationToken ct = default);

    /// <summary>
    ///     Загружает содержимое потока в хранилище по заданному ключу объекта.
    /// </summary>
    /// <param name="stream">Поток с данными для загрузки (должен быть открыт для чтения).</param>
    /// <param name="objectKey">Ключ (путь) объекта внутри bucket'а.</param>
    /// <param name="contentType">MIME-тип содержимого (например, <c>image/png</c>).</param>
    /// <param name="sizeBytes">Размер загружаемого содержимого в байтах.</param>
    /// <param name="bucket">Имя bucket'а (если <c>null</c>, используется значение по умолчанию).</param>
    /// <returns>Задача, завершающаяся после успешной загрузки файла.</returns>
    /// <remarks>Метод не закрывает поток <paramref name="stream"/>.</remarks>
    Task UploadAsync(Stream stream, string objectKey, string contentType, long sizeBytes, string? bucket = null);

    /// <summary>
    ///     Удаляет файл из хранилища по его абсолютному пути.
    /// </summary>
    /// <param name="absolutePath">Полный путь к объекту внутри bucket'а, например: <c>raids/1/screenshots/image.png</c>.</param>
    /// <param name="bucket">Имя bucket'а (если <c>null</c>, используется значение по умолчанию из конфигурации).</param>
    Task DeleteAsync(string absolutePath, string? bucket = null);
}