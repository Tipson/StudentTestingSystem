namespace Assessment.Domain.Questions;

/// <summary>
///     Тип вопроса в тесте.
/// </summary>
public enum QuestionType
{
    /// <summary>
    ///     Один правильный вариант ответа из списка.
    /// </summary>
    SingleChoice = 0,

    /// <summary>
    ///     Несколько правильных вариантов ответа.
    /// </summary>
    MultiChoice = 1,

    /// <summary>
    ///     Вопрос с ответом «Да / Нет» .
    /// </summary>
    TrueFalse = 2,

    /// <summary>
    ///     Короткий текстовый ответ (слово, число, фраза).
    /// </summary>
    ShortText = 3,

    /// <summary>
    ///     Развёрнутый текстовый ответ.
    /// </summary>
    LongText = 4
}