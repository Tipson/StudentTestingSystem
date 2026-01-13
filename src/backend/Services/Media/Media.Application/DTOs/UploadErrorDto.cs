namespace Media.Application.DTOs;

public sealed record UploadErrorDto(
    string FileName,
    string Error
);