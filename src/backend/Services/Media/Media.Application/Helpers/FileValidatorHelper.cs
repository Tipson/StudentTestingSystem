using BuildingBlocks.Api.Exceptions.Base;

namespace Media.Application.Helpers;

public static class FileValidatorHelper
{
    /// <summary>
    /// Максимальный размер изображения: 50 MB.
    /// </summary>
    public const long MaxImageSizeBytes = 50 * 1024 * 1024;
    
    /// <summary>
    /// Максимальный размер видео: 500 MB.
    /// </summary>
    public const long MaxVideoSizeBytes = 500 * 1024 * 1024;
    
    /// <summary>
    /// Максимальный размер документов и прочих файлов: 50 MB.
    /// </summary>
    public const long MaxDefaultSizeBytes = 500 * 1024 * 1024;
    
    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        // Изображения
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml",
        
        // Видео
        "video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/x-ms-wmv",
        "video/webm", "video/ogg", "video/3gpp", "video/3gpp2", "video/x-matroska",
        
        // Аудио
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", 
        "audio/flac", "audio/x-ms-wma", "audio/webm",
        
        // Документы
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
        
        // Текст
        "text/plain", "text/csv",
        
        // Архивы
        "application/zip", "application/x-rar-compressed", "application/x-7z-compressed",
        "application/gzip", "application/x-tar"
    };

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        // Изображения
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff",
        // Видео
        ".mp4", ".mpeg", ".mpg", ".mov", ".avi", ".wmv", ".webm", ".ogv", ".3gp", ".mkv",
        // Аудио
        ".mp3", ".wav", ".ogg", ".aac", ".flac", ".wma",
        // Документы
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".txt", ".csv",
        // Архивы
        ".zip", ".rar", ".7z", ".gz", ".tar"
    };

    /// <summary>
    /// Валидация MIME-типа и расширения файла.
    /// </summary>
    public static void ValidateMimeType(string contentType, string fileName)
    {
        if (!AllowedMimeTypes.Contains(contentType))
            throw new BadRequestApiException($"Недопустимый тип файла: {contentType}");

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        
        if (string.IsNullOrEmpty(extension))
            throw new BadRequestApiException("Файл должен иметь расширение");

        if (!AllowedExtensions.Contains(extension))
            throw new BadRequestApiException($"Недопустимое расширение файла: {extension}");
    }
    
    /// <summary>
    /// Валидация размера файла в зависимости от типа медиа.
    /// </summary>
    public static void ValidateFileSize(string contentType, long sizeBytes)
    {
        var maxSize = GetMaxSizeForContentType(contentType);
        
        if (sizeBytes > maxSize)
        {
            var maxSizeMb = maxSize / (1024 * 1024);
            var mediaTypeName = MediaTypeHelper.IsVideo(contentType) ? "видео" : 
                MediaTypeHelper.IsImage(contentType) ? "изображения" : "файла";
            
            throw new BadRequestApiException(
                $"Размер {mediaTypeName} превышает максимально допустимый ({maxSizeMb} MB)");
        }
    }

    /// <summary>
    /// Полная валидация файла: тип, расширение и размер.
    /// </summary>
    public static void ValidateFile(string contentType, string fileName, long sizeBytes)
    {
        ValidateMimeType(contentType, fileName);
        ValidateFileSize(contentType, sizeBytes);
    }

    /// <summary>
    /// Получить максимальный размер для типа контента.
    /// </summary>
    public static long GetMaxSizeForContentType(string contentType)
    {
        if (MediaTypeHelper.IsVideo(contentType))
            return MaxVideoSizeBytes;
        
        if (MediaTypeHelper.IsImage(contentType))
            return MaxImageSizeBytes;
        
        return MaxDefaultSizeBytes;
    }
}