namespace Assessment.Application.DTOs.Question;

public record UpdateQuestionDto
{
    public string Text { get; init; } = string.Empty;
    public int Points { get; init; }
    public List<UpdateQuestionOptionDto> Options { get; init; } = [];
}

public record UpdateQuestionOptionDto
{
    public string Text { get; init; } = string.Empty;
    public bool IsCorrect { get; init; }
    public int Order { get; init; }
}