// Media.Infrastructure/Storage/StorageProvider.cs

using BuildingBlocks.Api.Extensions;
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
    private bool _bucketEnsured;

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

    public async Task UploadAsync(Stream fileStream, string objectKey, string contentType, long sizeBytes, string? bucket = null)
    {
        bucket ??= _options.DefaultBucketName;
        
        //await EnsureBucketExistsAsync(bucket);

        if (fileStream.CanSeek)
            fileStream.Position = 0;

        var args = new PutObjectArgs()
            .WithBucket(bucket)
            .WithObject(objectKey)
            .WithStreamData(fileStream)
            .WithObjectSize(sizeBytes)
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

    /// <summary>
    ///     Проверяет наличие указанного bucket'а и создаёт его, если он отсутствует.
    ///     Автоматическое создание происходит только в окружениях Development или Compose.
    /// </summary>
    /// <param name="bucket">Имя bucket'а.</param>
    private async Task EnsureBucketExistsAsync(string bucket)
    {
        if (_bucketEnsured) return;

        try
        {
            var exists = await client.BucketExistsAsync(
                new BucketExistsArgs().WithBucket(bucket));
            
            if (!exists)
            {
                await client.MakeBucketAsync(
                    new MakeBucketArgs().WithBucket(bucket));
            }
        }
        catch
        {
            // Игнорируем — bucket может уже существовать или создан вручную
        }
        
        _bucketEnsured = true;
    }
}