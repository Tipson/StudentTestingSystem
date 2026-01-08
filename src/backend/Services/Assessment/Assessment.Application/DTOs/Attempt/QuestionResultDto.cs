namespace Assessment.Application.DTOs.Attempt;

public sealed record QuestionResultDto(
    Guid QuestionId,
    string Text,
    string Type,
    int Points,
    int PointsAwarded,
    bool IsCorrect,
    AnswerPayloadDto? UserAnswer,
    AnswerPayloadDto? CorrectAnswer
);