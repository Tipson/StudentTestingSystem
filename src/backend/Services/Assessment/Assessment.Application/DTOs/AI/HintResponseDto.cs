namespace Assessment.Application.DTOs.AI;

public sealed record HintResponseDto(
    string HintText,
    int HintLevel,
    int UsedCount,
    int RemainingCount);