namespace BuildingBlocks.AI.Prompts;

/// <summary>
/// Промпты для AI генерации тестов из документов.
/// </summary>
public static class TestGenerationPrompts
{
    public static string BuildTestGenerationPrompt(
        string documentText,
        int questionsCount,
        string? topic)
    {
        var topicPart = string.IsNullOrWhiteSpace(topic)
            ? ""
            : $"Тема теста: {topic}";

        return $@"
            Ты эксперт-методист, создающий тесты для студентов.

            Задача: На основе предоставленного текста создай тест из {questionsCount} вопросов.
            {topicPart}

            Текст документа:
            {documentText}

            Требования:
            1. Создай разнообразные типы вопросов: SingleChoice, MultipleChoice, LongText
            2. Вопросы должны проверять понимание ключевых концепций из текста
            3. Для SingleChoice: 4 варианта ответа, один правильный
            4. Для MultipleChoice: 4-6 вариантов, несколько правильных
            5. Для LongText: открытый вопрос, требующий развернутого ответа
            6. Распределяй баллы: простые вопросы 1-2 балла, сложные 3-5 баллов
            7. Вопросы должны быть чёткими и однозначными
            8. Избегай слишком очевидных или слишком сложных вопросов

            Верни ТОЛЬКО JSON (без markdown):
            {{
              ""testTitle"": ""название теста на основе темы документа"",
              ""description"": ""краткое описание что проверяет этот тест"",
              ""questions"": [
                {{
                  ""text"": ""текст вопроса"",
                  ""type"": ""SingleChoice"" | ""MultipleChoice"" | ""LongText"",
                  ""options"": [""вариант1"", ""вариант2"", ...] или null для LongText,
                  ""correctAnswer"": ""правильный ответ или критерии оценки"",
                  ""points"": число баллов
                }}
              ]
            }}";
    }
}