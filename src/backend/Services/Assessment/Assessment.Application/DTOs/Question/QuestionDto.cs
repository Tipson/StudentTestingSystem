using Assessment.Domain.Questions;

namespace Assessment.Application.DTOs.Question;

public sealed record QuestionDto(
    Guid Id,
    Guid TestId,
    int Order,
    QuestionType Type,
    string Text,
    bool IsRequired,
    int Points,
    List<QuestionOptionDto> Options
);

public sealed record QuestionOptionDto(
    Guid Id,
    string Text,
    int Order,
    bool? IsCorrect
);