using Media.Domain;

namespace Media.Application.Helpers;

public static class MediaTypeHelper
{
    private static readonly HashSet<string> ImageMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", 
        "image/svg+xml", "image/bmp", "image/tiff"
    };

    private static readonly HashSet<string> VideoMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/x-ms-wmv",
        "video/webm", "video/ogg", "video/3gpp", "video/3gpp2", "video/x-matroska"
    };

    private static readonly HashSet<string> ArchiveMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/zip", "application/x-rar-compressed", "application/x-7z-compressed",
        "application/gzip", "application/x-tar"
    };

    /// <summary>
    /// Определяет тип медиа по MIME-типу.
    /// </summary>
    public static MediaType GetMediaType(string contentType)
    {
        if (ImageMimeTypes.Contains(contentType))
            return MediaType.Image;
        
        if (VideoMimeTypes.Contains(contentType))
            return MediaType.Video;
        
        if (ArchiveMimeTypes.Contains(contentType))
            return MediaType.Archive;
        
        return MediaType.Document;
    }

    /// <summary>
    /// Проверяет, является ли файл изображением.
    /// </summary>
    public static bool IsImage(string contentType) => ImageMimeTypes.Contains(contentType);

    /// <summary>
    /// Проверяет, является ли файл видео.
    /// </summary>
    public static bool IsVideo(string contentType) => VideoMimeTypes.Contains(contentType);
    
}