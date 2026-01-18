namespace BuildingBlocks.Integrations.Gemini.Models;

/// <summary>
/// Технические модели для работы с Gemini API.
/// </summary>
internal sealed record GeminiRequest(
    Content[] Contents,
    GenerationConfig GenerationConfig);

internal sealed record Content(Part[] Parts);

internal sealed record Part(string Text);

internal sealed record GenerationConfig(
    double Temperature,
    int MaxOutputTokens);

internal sealed record GeminiResponse(Candidate[]? Candidates);

internal sealed record Candidate(ContentResponse? Content);

internal sealed record ContentResponse(PartResponse[]? Parts);

internal sealed record PartResponse(string? Text);