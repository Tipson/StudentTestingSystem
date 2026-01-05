// Media.Infrastructure/Storage/StorageProvider.cs

using Media.Application.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;

namespace Media.Infrastructure.Storage;

public sealed class StorageProvider(
    IMinioClient client,
    IWebHostEnvironment env,
    IOptions<StorageOptions> options)
    : IStorageProvider
{
    private readonly StorageOptions _options = options.Value;

    public async Task<Stream> GetAsync(string path, string? bucket = null)
    {
        bucket ??= _options.DefaultBucketName;
        var ms = new MemoryStream();

        var args = new GetObjectArgs()
            .WithBucket(bucket)
            .WithObject(path)
            .WithCallbackStream(s => s.CopyTo(ms));

        await client.GetObjectAsync(args);
        ms.Position = 0;
        return ms;
    }

    public async Task UploadAsync(Stream fileStream, string path, string fileName, string contentType, string? bucket = null)
    {
        bucket ??= _options.DefaultBucketName;
        await EnsureBucketExistsAsync(bucket);

        var objectName = string.IsNullOrWhiteSpace(path) ? fileName : fileName;

        var args = new PutObjectArgs()
            .WithBucket(bucket)
            .WithObject(objectName)
            .WithStreamData(fileStream)
            .WithObjectSize(fileStream.Length)
            .WithContentType(contentType);

        await client.PutObjectAsync(args);
    }

    public async Task DeleteAsync(string path, string? bucket = null)
    {
        bucket ??= _options.DefaultBucketName;

        var args = new RemoveObjectArgs()
            .WithBucket(bucket)
            .WithObject(path);

        await client.RemoveObjectAsync(args);
    }

    private async Task EnsureBucketExistsAsync(string bucket)
    {
        if (!env.IsDevelopment())
            return;

        var exists = await client.BucketExistsAsync(new BucketExistsArgs().WithBucket(bucket));
        if (!exists)
            await client.MakeBucketAsync(new MakeBucketArgs().WithBucket(bucket));
    }
}