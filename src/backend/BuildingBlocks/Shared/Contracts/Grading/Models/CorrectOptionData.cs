namespace Contracts.Grading.Models;


public sealed record CorrectOptionData
{
    public required Guid Id { get; init; }
    public required string? Text { get; init; } // Для ShortText
}