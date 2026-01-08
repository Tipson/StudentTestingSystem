namespace Assessment.Application.DTOs.Attempt;

public sealed record AnswerPayloadDto(
    Guid? OptionId,
    IReadOnlyList<Guid>? OptionIds,
    string? Text
);