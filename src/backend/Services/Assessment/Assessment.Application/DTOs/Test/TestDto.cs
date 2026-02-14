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
    int RemainingAttempts, // Количество оставшихся попыток для текущего пользователя
    bool AllowAiHints,
    DateTimeOffset CreatedAt,
    DateTimeOffset? PublishedAt
);
