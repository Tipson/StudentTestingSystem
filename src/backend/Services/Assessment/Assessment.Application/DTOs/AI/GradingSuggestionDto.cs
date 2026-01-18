namespace Assessment.Application.DTOs.AI;

public record GradingSuggestionDto(
    int SuggestedPoints,
    string Comments,
    double Confidence);