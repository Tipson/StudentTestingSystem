using System.ComponentModel.DataAnnotations;

namespace Assessment.Application.DTOs.Test;

public sealed record CreateTestDto(
    [Required, MaxLength(200)] 
    string Title,
    [MaxLength(2000)] 
    string? Description
);