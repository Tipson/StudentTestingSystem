using BuildingBlocks.Api.Exceptions.Base;

namespace Media.Application.Helpers;

public static class FileValidatorHelper
{
    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        // Изображения
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml",
        
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
        "application/zip", "application/x-rar-compressed"
    };

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".txt", ".csv", ".zip", ".rar"
    };

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
}