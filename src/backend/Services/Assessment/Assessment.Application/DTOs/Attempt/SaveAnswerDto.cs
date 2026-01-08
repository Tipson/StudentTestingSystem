namespace Assessment.Application.DTOs.Attempt;

public sealed record SaveAnswerDto(
    Guid? OptionId = null,
    IReadOnlyList<Guid>? OptionIds = null,
    string? Text = null
);