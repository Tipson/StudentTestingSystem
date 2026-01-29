namespace Assessment.Application.DTOs.Test;

public sealed record UpdateTestDto(
    string Title,
    string? Description,
    int PassScore,
    int AttemptsLimit,
    int? TimeLimitSeconds,
    bool AllowAiHints
);