using System.ComponentModel.DataAnnotations;
using Assessment.Domain.Questions;

namespace Assessment.Application.DTOs.Question;

public sealed record CreateQuestionDto(
    [Required, MaxLength(4000)]
    string Text,

    [Required]
    QuestionType Type,

    bool IsRequired = true,

    [Range(0, 1000)]
    int Points = 1,
    
    List<CreateQuestionOptionDto>? Options = null

);

public sealed record CreateQuestionOptionDto(
    [Required, MaxLength(2000)]
    string Text,
    
    bool IsCorrect = false,
    
    int Order = 0
);