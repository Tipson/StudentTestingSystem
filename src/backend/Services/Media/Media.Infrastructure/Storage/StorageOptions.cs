namespace Media.Infrastructure.Storage;

public sealed class StorageOptions
{
    public string Host { get; set; } = "localhost:9000";
    public string AccessKey { get; set; } = "minioadmin";
    public string SecretKey { get; set; } = "minioadmin";
    public string DefaultBucketName { get; set; } = "assessment";
    public bool WithSsl { get; set; } = false;
}