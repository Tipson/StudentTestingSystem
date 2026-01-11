namespace Assessment.Domain.Attempts;

public sealed record AnswerPayload
{
    /// <summary>
    ///     Выбранный вариант ответа (SingleChoice, TrueFalse).
    /// </summary>
    public Guid? OptionId { get; init; }

    /// <summary>
    ///     Выбранные варианты ответа (MultiChoice).
    /// </summary>
    public IReadOnlyList<Guid>? OptionIds { get; init; }

    /// <summary>
    ///     Текстовый ответ (ShortText, LongText).
    /// </summary>
    public string? Text { get; init; }
}
