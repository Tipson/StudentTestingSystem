namespace Assessment.Application.DTOs.Attempt;

public sealed record AttemptAnswerDto(
    Guid Id,
    Guid QuestionId,
    AnswerPayloadDto Answer,
    DateTimeOffset UpdatedAt,
    bool? IsCorrect,
    int? PointsAwarded
);