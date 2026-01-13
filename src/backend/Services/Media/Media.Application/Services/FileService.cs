using System.IO.Compression;
using System.IO.Pipelines;
using Application;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Mapster;
using Media.Application.DTOs;
using Media.Application.Helpers;
using Media.Application.Interfaces;
using Media.Domain;
using Microsoft.AspNetCore.Http;

namespace Media.Application.Services;

public sealed class FileService(
    IStorageProvider storage,
    IMediaRepository repository,
    IUserContext? userContext)
    : IFileService
{
    private const int MaxFilesPerRequest = 100;
    private static readonly TimeSpan PresignedUrlExpiry = TimeSpan.FromHours(1);

    public async Task<UploadResultDto> UploadAsync(
        List<IFormFile> files,
        string category,
        Guid? entityId,
        CancellationToken ct)
    {
        var userId = userContext?.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var uploaded = new List<MediaFileDto>();
        var errors = new List<UploadErrorDto>();

        foreach (var file in files)
        {
            try
            {
                await using var stream = file.OpenReadStream();
                var dto = await UploadSingleAsync(stream, file.FileName, file.ContentType, file.Length, category, entityId, userId, ct);
                uploaded.Add(dto);
            }
            catch (BadRequestApiException ex)
            {
                errors.Add(new UploadErrorDto(file.FileName, ex.Message));
            }
        }

        return new UploadResultDto(uploaded, errors);
    }

    public async Task<List<MediaFileDto>> GetAsync(IEnumerable<Guid> ids, CancellationToken ct)
    {
        var idList = ids.Distinct().ToList();
        ValidateIdCount(idList.Count);

        if (idList.Count == 0)
            return [];

        var files = await repository.GetByIdsAsync(idList, ct);
        return await MapToDtosAsync(files);
    }

    public async Task<FileDownloadResultDto> DownloadAsync(IEnumerable<Guid> ids, CancellationToken ct)
    {
        var idList = ids.Distinct().ToList();

        ValidateIdCount(idList.Count);

        if (idList.Count == 0)
            throw new BadRequestApiException("Необходимо указать хотя бы один ID файла");

        var files = await repository.GetByIdsAsync(idList, ct);

        if (files.Count == 0)
            throw new EntityNotFoundException("Файлы не найдены");

        // Один файл — возвращаем presigned URL для редиректа
        if (files.Count == 1)
        {
            var file = files[0];
            var url = await storage.GetPresignedUrlAsync(file.StoragePath, PresignedUrlExpiry);

            return new FileDownloadResultDto
            {
                RedirectUrl = url,
                FileName = file.FileName
            };
        }

        // Несколько файлов — ZIP-архив через стриминг
        var stream = CreateZipStream(files, ct);

        return new FileDownloadResultDto
        {
            Stream = stream,
            ContentType = "application/zip",
            FileName = $"files_{DateTime.UtcNow:yyyyMMdd_HHmmss}.zip"
        };
    }

    public async Task<List<MediaFileDto>> GetMyFilesAsync(CancellationToken ct)
    {
        var userId = userContext?.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var files = await repository.GetByOwnerAsync(userId, ct);
        return await MapToDtosAsync(files);
    }

    public async Task<DeleteResultDto> DeleteAsync(IEnumerable<Guid> ids, CancellationToken ct)
    {
        var idList = ids.Distinct().ToList();

        ValidateIdCount(idList.Count);

        if (idList.Count == 0)
            return new DeleteResultDto(0, [], new Dictionary<Guid, string>());

        var userId = userContext?.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var files = await repository.GetByIdsAsync(idList, ct);
        var foundIds = files.Select(f => f.Id).ToHashSet();

        var errors = new Dictionary<Guid, string>();
        var filesToDelete = new List<MediaFile>();

        foreach (var id in idList)
        {
            if (!foundIds.Contains(id))
            {
                errors[id] = "Файл не найден";
                continue;
            }

            var file = files.First(f => f.Id == id);

            if (file.OwnerUserId != userId)
            {
                errors[id] = "Нет прав на удаление файла";
                continue;
            }

            filesToDelete.Add(file);
        }

        foreach (var file in filesToDelete)
        {
            try
            {
                await storage.DeleteAsync(file.StoragePath);
            }
            catch
            {
                // Файл может быть уже удалён
            }
        }

        if (filesToDelete.Count > 0)
        {
            await repository.DeleteManyAsync(filesToDelete, ct);
        }

        return new DeleteResultDto(
            filesToDelete.Count,
            errors.Keys.ToList(),
            errors
        );
    }

    private Stream CreateZipStream(List<MediaFile> files, CancellationToken ct)
    {
        var pipe = new Pipe();

        _ = Task.Run(async () =>
        {
            try
            {
                await using var zipStream = pipe.Writer.AsStream();
                await using var archive = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: false);

                var fileNameCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

                foreach (var file in files)
                {
                    if (ct.IsCancellationRequested)
                        break;

                    try
                    {
                        await using var fileStream = await storage.GetAsync(file.StoragePath);
                        var entryName = GetUniqueFileName(file.FileName, fileNameCounts);

                        var entry = archive.CreateEntry(entryName, CompressionLevel.Fastest);
                        await using var entryStream = entry.Open();
                        await fileStream.CopyToAsync(entryStream, ct);
                    }
                    catch
                    {
                        // Пропускаем файлы, которые не удалось скачать
                    }
                }
            }
            catch (Exception ex)
            {
                await pipe.Writer.CompleteAsync(ex);
                return;
            }

            await pipe.Writer.CompleteAsync();
        }, ct);

        return pipe.Reader.AsStream();
    }

    private async Task<List<MediaFileDto>> MapToDtosAsync(List<MediaFile> files)
    {
        var result = new List<MediaFileDto>(files.Count);

        foreach (var file in files)
        {
            var url = await storage.GetPresignedUrlAsync(file.StoragePath, PresignedUrlExpiry);
            result.Add(file.Adapt<MediaFileDto>() with { DownloadUrl = url });
        }

        return result;
    }

    private async Task<MediaFileDto> UploadSingleAsync(
        Stream stream,
        string fileName,
        string contentType,
        long sizeBytes,
        string category,
        Guid? entityId,
        string userId,
        CancellationToken ct)
    {
        FileValidatorHelper.ValidateFile(contentType, fileName, sizeBytes);

        var generatedName = StorageHelper.GenerateFileName(fileName);
        var key = StorageHelper.GetStoragePath(category, entityId, generatedName);

        await storage.UploadAsync(stream, key, contentType, sizeBytes);

        var mediaFile = new MediaFile(fileName, contentType, sizeBytes, key, userId);

        await repository.AddAsync(mediaFile, ct);

        var url = await storage.GetPresignedUrlAsync(mediaFile.StoragePath, PresignedUrlExpiry);
        return mediaFile.Adapt<MediaFileDto>() with { DownloadUrl = url };
    }

    private static string GetUniqueFileName(string fileName, Dictionary<string, int> fileNameCounts)
    {
        if (!fileNameCounts.TryGetValue(fileName, out var count))
        {
            fileNameCounts[fileName] = 1;
            return fileName;
        }

        fileNameCounts[fileName] = count + 1;

        var nameWithoutExt = Path.GetFileNameWithoutExtension(fileName);
        var ext = Path.GetExtension(fileName);

        return $"{nameWithoutExt}_{count}{ext}";
    }

    private static void ValidateIdCount(int count)
    {
        if (count > MaxFilesPerRequest)
            throw new BadRequestApiException($"Максимум {MaxFilesPerRequest} файлов за один запрос");
    }
}