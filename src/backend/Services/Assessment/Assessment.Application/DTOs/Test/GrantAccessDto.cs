namespace Assessment.Application.DTOs.Test;

public sealed record GrantAccessToUserDto(string UserId, DateTimeOffset? ExpiresAt = null);

public sealed record GrantAccessToGroupDto(Guid GroupId, DateTimeOffset? ExpiresAt = null);

public sealed record CreateInviteLinkDto(int? MaxUses = null, DateTimeOffset? ExpiresAt = null);