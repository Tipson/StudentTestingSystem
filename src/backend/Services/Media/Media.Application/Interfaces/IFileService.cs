using Media.Application.DTOs;

namespace Media.Application.Interfaces;

public interface IFileService
{
    Task<MediaFileDto> UploadAsync(Stream stream, string fileName, string contentType, long sizeBytes, string category, Guid? entityId, CancellationToken ct);
    Task<Stream> DownloadAsync(Guid id, CancellationToken ct);
    Task<MediaFileDto?> GetAsync(Guid id, CancellationToken ct);
    Task<List<MediaFileDto>> GetMyFilesAsync(CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);
}