namespace BuildingBlocks.AI.Prompts;

/// <summary>
/// Промпты для AI проверки развернутых ответов.
/// </summary>
public static class GradingPrompts
{
    public static string BuildGradingPrompt(
        string questionText,
        string? expectedAnswer,
        string? studentAnswer,
        int maxPoints)
    {
        var criteriaSection = string.IsNullOrWhiteSpace(expectedAnswer)
            ? BuildCriteriaSectionWithoutExpectedAnswer()
            : BuildCriteriaSectionWithExpectedAnswer(expectedAnswer);

        var pointsScale = BuildPointsScale(maxPoints);

        return $@"
            Ты эксперт-преподаватель, проверяющий развернутые ответы студентов.

            Вопрос: {questionText}
            Ответ студента: {studentAnswer}
            Максимум баллов: {maxPoints}

            {criteriaSection}

            {pointsScale}

            Верни ТОЛЬКО JSON (без markdown):
            {{
              ""points"": число от 0 до {maxPoints},
              ""comment"": ""развернутый комментарий для студента на русском, объясни почему такая оценка и что можно улучшить"",
              ""confidence"": число от 0.0 до 1.0 (насколько уверен в оценке)
            }}";
    }

    private static string BuildCriteriaSectionWithoutExpectedAnswer()
    {
        return @"
            ВАЖНО: У тебя нет эталонного ответа. Оцени ответ студента по следующим критериям:

            1. **Соответствие вопросу** (30%) - отвечает ли студент на заданный вопрос
            2. **Корректность информации** (40%) - правильна ли фактическая информация
            3. **Полнота ответа** (20%) - раскрыта ли тема достаточно
            4. **Логичность изложения** (10%) - есть ли структура и связность";
                }

                private static string BuildCriteriaSectionWithExpectedAnswer(string expectedAnswer)
                {
                    return $@"
            Критерии оценивания / Эталонный ответ: {expectedAnswer}

            Оцени насколько ответ студента соответствует критериям:
            1. **Соответствие критериям** (50%) - есть ли все ключевые моменты
            2. **Корректность** (30%) - нет ли фактических ошибок
            3. **Полнота** (20%) - достаточно ли раскрыта тема";
    }

    private static string BuildPointsScale(int maxPoints)
    {
        return $@"
            Шкала оценивания:
            - {maxPoints} баллов: отличный, полный и корректный ответ
            - {Math.Round(maxPoints * 0.75)}-{maxPoints - 1} баллов: хороший ответ с небольшими недочетами
            - {Math.Round(maxPoints * 0.5)}-{Math.Round(maxPoints * 0.74)} баллов: удовлетворительный, неполный ответ
            - {Math.Round(maxPoints * 0.25)}-{Math.Round(maxPoints * 0.49)} баллов: слабый ответ с пробелами
            - 0-{Math.Round(maxPoints * 0.24)} баллов: неудовлетворительный или неверный ответ";
    }
}