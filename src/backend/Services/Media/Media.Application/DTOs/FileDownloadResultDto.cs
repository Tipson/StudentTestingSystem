namespace Media.Application.DTOs;

/// <summary>
/// Результат скачивания файлов.
/// </summary>
public sealed class FileDownloadResultDto
{
    public Stream? Stream { get; init; }
    public string? RedirectUrl { get; init; }
    public string? ContentType { get; init; }
    public required string FileName { get; init; }
    
    public bool IsRedirect => RedirectUrl is not null;
}