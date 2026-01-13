using Media.Application.DTOs;
using QuestionType = Contracts.Assessment.Enums.QuestionType;

namespace Assessment.Application.DTOs.Question;

public sealed record QuestionDto(
    Guid Id,
    Guid TestId,
    int Order,
    QuestionType Type,
    string Text,
    bool IsRequired,
    int Points,
    List<QuestionOptionDto> Options,
    List<QuestionMediaDto>? Media
);

public sealed record QuestionOptionDto(
    Guid Id,
    string Text,
    int Order,
    bool? IsCorrect,
    List<QuestionOptionMediaDto> Media
);

public sealed record QuestionMediaDto(
    Guid Id,
    Guid MediaId,
    int Order
);

public sealed record QuestionOptionMediaDto(
    Guid Id,
    Guid MediaId,
    int Order);