using Media.Application.DTOs;
using Microsoft.AspNetCore.Http;

namespace Media.Application.Interfaces;

public interface IFileService
{
    /// <summary>
    /// Загрузить файл.
    /// </summary>
    Task<UploadResultDto> UploadAsync(
        List<IFormFile> files,
        string category,
        Guid? entityId,
        CancellationToken ct);

    /// <summary>
    /// Получить метаданные файлов по ID.
    /// </summary>
    Task<List<MediaFileDto>> GetAsync(IEnumerable<Guid> ids, CancellationToken ct);

    /// <summary>
    /// Скачать файлы. Если один файл — возвращает его напрямую, если несколько — ZIP-архив.
    /// </summary>
    Task<FileDownloadResultDto> DownloadAsync(IEnumerable<Guid> ids, CancellationToken ct);

    /// <summary>
    /// Получить файлы текущего пользователя.
    /// </summary>
    Task<List<MediaFileDto>> GetMyFilesAsync(CancellationToken ct);

    /// <summary>
    /// Удалить файлы.
    /// </summary>
    Task<DeleteResultDto> DeleteAsync(IEnumerable<Guid> ids, CancellationToken ct);
}