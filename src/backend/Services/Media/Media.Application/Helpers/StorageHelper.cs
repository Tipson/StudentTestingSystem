namespace Media.Application.Helpers;

public static class StorageHelper
{
    public static string GenerateFileName(string originalFileName)
    {
        return $"{Guid.NewGuid():N}{Path.GetExtension(originalFileName)}";
    }

    public static string GetStoragePath(string category, Guid? entityId, string fileName)
    {
        var basePath = entityId.HasValue
            ? $"{category}/{entityId.Value}"
            : category;

        return $"{basePath}/{fileName}";
    }
}