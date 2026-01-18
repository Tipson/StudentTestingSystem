namespace Media.Application.DTOs;

public sealed record UploadResultDto(
    List<MediaFileDto> Uploaded,
    List<UploadErrorDto> Errors
);