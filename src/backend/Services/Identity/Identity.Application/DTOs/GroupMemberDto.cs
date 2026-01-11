namespace Identity.Application.DTOs;

public sealed record GroupMemberDto(
    string UserId,
    string? Email,
    string? FullName
);