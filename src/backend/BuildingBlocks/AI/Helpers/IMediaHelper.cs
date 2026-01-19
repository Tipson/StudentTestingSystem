using BuildingBlocks.Integrations.Gemini.Models;

namespace BuildingBlocks.AI.Helpers;

public interface IMediaHelper
{
    /// <summary>
    /// Загружает медиа-файл из MinIO и конвертирует в base64.
    /// </summary>
    Task<MediaContent?> GetMediaContentAsync(Guid mediaId, CancellationToken ct = default);
    
    /// <summary>
    /// Загружает несколько медиа-файлов параллельно.
    /// </summary>
    Task<List<MediaContent>> GetMediaContentsAsync(
        IEnumerable<Guid> mediaIds,
        CancellationToken ct = default);
}