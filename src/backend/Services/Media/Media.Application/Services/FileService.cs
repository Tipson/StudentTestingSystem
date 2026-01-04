using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using Mapster;
using Media.Application.DTOs;
using Media.Application.Helpers;
using Media.Application.Interfaces;
using Media.Domain;

namespace Media.Application.Services;

public sealed class FileService(
    IStorageProvider storage,
    IMediaRepository repository,
    IUserContext userContext)
    : IFileService
{
    public async Task<MediaFileDto> UploadAsync(
        Stream stream,
        string fileName,
        string contentType,
        long sizeBytes,
        string category,
        Guid? entityId,
        CancellationToken ct)
    {
        var generatedName = StorageHelper.GenerateFileName(fileName);
        var key = StorageHelper.GetStoragePath(category, entityId, generatedName);

        await storage.UploadAsync(stream, key, contentType, sizeBytes);
        
        var mediaFile = new MediaFile(fileName, contentType, sizeBytes, key, userContext.UserId);

        await repository.AddAsync(mediaFile, ct);

        return mediaFile.Adapt<MediaFileDto>();
    }

    public async Task<Stream> DownloadAsync(Guid id, CancellationToken ct)
    {
        var file = await repository.GetByIdAsync(id, ct)
                   ?? throw new EntityNotFoundException("Файл не найден");

        return await storage.GetAsync(file.StoragePath);
    }

    public async Task<MediaFileDto?> GetAsync(Guid id, CancellationToken ct)
    {
        var file = await repository.GetByIdAsync(id, ct);
        return file?.Adapt<MediaFileDto>();
    }

    public async Task<List<MediaFileDto>> GetMyFilesAsync(CancellationToken ct)
    {
        var files = await repository.GetByOwnerAsync(userContext.UserId, ct);
        return files.Adapt<List<MediaFileDto>>();
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var file = await repository.GetByIdAsync(id, ct)
                   ?? throw new EntityNotFoundException("Файл не найден");

        if (file.OwnerUserId != userContext.UserId)
            throw new ForbiddenException("Нет прав на удаление файла");

        await storage.DeleteAsync(file.StoragePath);
        await repository.DeleteAsync(file, ct);
    }
}