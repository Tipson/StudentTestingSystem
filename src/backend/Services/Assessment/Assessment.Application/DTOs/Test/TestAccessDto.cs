namespace Assessment.Application.DTOs.Test;

public sealed record TestAccessDto(
    Guid Id,
    Guid TestId,
    string GrantType,
    string? UserId,
    Guid? GroupId,
    Guid? InviteCode,
    string GrantedByUserId,
    DateTimeOffset GrantedAt,
    DateTimeOffset? ExpiresAt,
    int? MaxUses,
    int UsedCount,
    bool IsExpired,
    bool CanBeUsed
);