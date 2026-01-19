namespace BuildingBlocks.AI.Models;

/// <summary>
/// Запрос на генерацию подсказки для студента.
/// </summary>
public sealed record HintRequest(
    string QuestionText, 
    string? StudentPartialAnswer,
    int HintLevel,
    List<Guid>? QuestionMediaIds = null);

/// <summary>
/// Ответ с AI подсказкой.
/// </summary>
public sealed record HintResponse(
    string Hint,
    int Level);