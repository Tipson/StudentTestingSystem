using BuildingBlocks.AI.Models;

namespace BuildingBlocks.AI.Prompts;

/// <summary>
/// Промпты для AI генерации тестов из документов.
/// </summary>
public static class TestGenerationPrompts
{
    // BuildingBlocks/AI/Prompts/TestGenerationPrompts.cs

public static string BuildTestGenerationPrompt(
    string? documentText,
    int questionsCount,
    string? topic,
    TestGenerationMode mode = TestGenerationMode.Balanced)
    {
        var topicPart = string.IsNullOrWhiteSpace(topic)
            ? ""
            : $"Тема теста: {topic}";

        var modeInstructions = GetModeInstructions(mode);
        
        var documentInstruction = string.IsNullOrWhiteSpace(documentText)
            ? "Документ прикреплён как изображение/PDF. Изучи его содержимое."
            : $"Текст документа:\n{documentText}";

        return $@"
    Ты эксперт-методист, создающий тесты для студентов.

    Задача: Создай тест из {questionsCount} вопросов на основе документа.
    {topicPart}

    {documentInstruction}

    Режим генерации: {mode}
    {modeInstructions}

    Требования:
    1. Вопросы должны проверять понимание ключевых концепций
    2. Для SingleChoice: 4 варианта ответа, один правильный
    3. Для MultipleChoice: 4-6 вариантов, несколько правильных
    4. Для LongText: открытый вопрос с развернутым ответом
    5. Распределяй баллы: простые 1-2, средние 3-4, сложные 5 баллов
    6. Вопросы должны быть чёткими и однозначными

    Верни ТОЛЬКО JSON:
    {{
      ""testTitle"": ""название теста"",
      ""description"": ""описание что проверяет тест"",
      ""questions"": [
        {{
          ""text"": ""текст вопроса"",
          ""type"": ""SingleChoice"" | ""MultipleChoice"" | ""LongText"",
          ""options"": [""вариант1"", ...] или null,
          ""correctAnswer"": ""правильный ответ"",
          ""points"": число баллов
        }}
      ]
    }}";
    }

    private static string GetModeInstructions(TestGenerationMode mode)
    {
        return mode switch
        {
            TestGenerationMode.Balanced => 
                "Создай сбалансированный тест: 60% закрытых вопросов, 40% открытых.",
            
            TestGenerationMode.ClosedQuestions => 
                "Создай ТОЛЬКО закрытые вопросы (SingleChoice и MultipleChoice).",
            
            TestGenerationMode.OpenQuestions => 
                "Создай ТОЛЬКО открытые вопросы (LongText).",
            
            TestGenerationMode.FinalExam => 
                @"Создай ИТОГОВЫЙ ТЕСТ:
                - Охвати ВСЕ основные темы документа
                - 20% простых, 50% средних, 30% сложных вопросов
                - 50% закрытых, 50% открытых",
            
            _ => string.Empty
        };
    }
}