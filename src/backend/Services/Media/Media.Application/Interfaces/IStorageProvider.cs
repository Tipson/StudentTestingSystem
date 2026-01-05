namespace Media.Application.Interfaces;

/// <summary>
/// Провайдер хранилища (MinIO).
/// </summary>
public interface IStorageProvider
{
    Task<Stream> GetAsync(string path, string? bucket = null);
    Task UploadAsync(Stream fileStream, string path, string fileName, string contentType, string? bucket = null);
    Task DeleteAsync(string path, string? bucket = null);
}