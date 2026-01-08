using Contracts.Identity;

namespace Identity.Application.DTOs;

public sealed record UserDto(
    string Id,
    string? Email,
    string? FullName,
    long? TelegramId,
    UserRole Role,
    bool IsActive,
    DateTimeOffset CreatedAt,
    Guid? GroupId
);
