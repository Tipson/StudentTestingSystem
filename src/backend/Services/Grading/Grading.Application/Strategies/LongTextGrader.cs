using Contracts.Assessment;
using Contracts.Assessment.Enums;
using Contracts.Grading.Models;

namespace Grading.Application.Strategies;

/// <summary>
/// Проверка длинных текстовых ответов.
/// </summary>
public sealed class LongTextGrader : IQuestionGrader
{
    public QuestionType QuestionType => QuestionType.LongText;

    public GradingResult Grade(AnswerPayload answer, QuestionData question)
    {
        // TODO: В будущем добавить AI-проверку через IGradingStrategy
        return GradingResult.ManualReviewRequired();
    }
}