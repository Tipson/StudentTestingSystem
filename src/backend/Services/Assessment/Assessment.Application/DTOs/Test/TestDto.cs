namespace Assessment.Application.DTOs.Test;

public sealed record TestDto(
    Guid Id,
    string Title,
    string? Description,
    string OwnerUserId,
    string Status,
    int? TimeLimitSeconds,
    int PassScore,
    int AttemptsLimit,
    DateTimeOffset CreatedAt,
    DateTimeOffset? PublishedAt
);