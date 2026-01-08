using System.ComponentModel.DataAnnotations;

namespace Assessment.Application.DTOs.Test;

public sealed record UpdateTestSettingsDto(
    [Required, MaxLength(200)]
    string Title,

    [MaxLength(2000)]
    string? Description,

    // null — без ограничения, иначе >= 1
    [Range(1, int.MaxValue)]
    int? TimeLimitSeconds,

    [Range(0, 100)]
    int PassScore,

    [Range(1, 20)]
    int AttemptsLimit
);