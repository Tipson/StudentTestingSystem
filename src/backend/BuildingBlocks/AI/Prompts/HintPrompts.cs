namespace BuildingBlocks.AI.Prompts;

/// <summary>
/// Промпты для генерации AI подсказок.
/// </summary>
public static class HintPrompts
{
    public static string BuildHintPrompt(
        string questionText,
        string? studentPartialAnswer,
        int hintLevel)
    {
        var contextPart = string.IsNullOrWhiteSpace(studentPartialAnswer)
            ? "Студент ещё не начал отвечать."
            : $"Текущая попытка студента: {studentPartialAnswer}";

        return $@"
            Ты помощник студента. Дай НАВОДЯЩУЮ подсказку, НЕ прямой ответ.

            Вопрос: {questionText}
            {contextPart}
            Уровень подсказки: {hintLevel}/3

            Правила:
            - Уровень 1: общее направление, намек на тему
            - Уровень 2: ключевое слово или концепция
            - Уровень 3: почти прямая подсказка, но студент должен додумать сам

            НИКОГДА не давай прямой ответ!

            Примеры ХОРОШИХ подсказок:
            - ""Подумай о том, как связаны эти два понятия""
            - ""Вспомни формулу, которая описывает это явление""
            - ""Ключевое слово здесь - 'равновесие'""

            Примеры ПЛОХИХ подсказок (НЕ делай так):
            - ""Ответ: 42""
            - ""Правильный ответ - фотосинтез""

            Верни ТОЛЬКО JSON (без markdown блоков):
            {{
              ""hint"": ""текст подсказки на русском"",
              ""level"": {hintLevel}
            }}";
    }
}