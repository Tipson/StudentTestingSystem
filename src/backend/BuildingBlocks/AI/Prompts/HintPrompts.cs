namespace BuildingBlocks.AI.Prompts;

/// <summary>
/// Промпты для генерации AI подсказок.
/// </summary>
public static class HintPrompts
{
    public static string BuildHintPrompt(
        string questionText,
        string? studentPartialAnswer,
        int hintLevel,
        bool hasMedia = false)
    {
        var mediaInstruction = hasMedia
            ? @"
                ВАЖНО: В вопросе есть изображения. При подсказке:
                - Направляй внимание студента на ключевые детали изображения
                - Не описывай всё изображение полностью
                - Давай подсказки о том, на что обратить внимание"
                            : string.Empty;

                        var levelInstruction = hintLevel switch
                        {
                            1 => "Дай ОБЩЕЕ направление мысли. Не раскрывай детали.",
                            2 => "Дай подсказку про КЛЮЧЕВОЕ понятие или элемент.",
                            3 => "Дай ПОЧТИ прямую подсказку, но не полный ответ.",
                            _ => "Дай наводящую подсказку."
                        };

                        var partialAnswerSection = !string.IsNullOrWhiteSpace(studentPartialAnswer)
                            ? $"Текущий ответ студента: {studentPartialAnswer}"
                            : "Студент ещё не начал отвечать.";

                        return $@"
                Ты преподаватель, помогающий студенту наводящими вопросами.
                {mediaInstruction}

                Вопрос: {questionText}
                {partialAnswerSection}

                Уровень подсказки: {hintLevel}
                {levelInstruction}

                НЕ ДАВАЙ ПРЯМОЙ ОТВЕТ. Только наведи на правильную мысль.
                Ответь кратко (1-2 предложения).";
    }
}