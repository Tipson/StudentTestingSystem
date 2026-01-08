namespace Media.Application.DTOs;

public sealed record MediaFileDto(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeBytes,
    string OwnerUserId,
    DateTimeOffset UploadedAt,
    string DownloadUrl
);