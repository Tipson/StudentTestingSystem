using Contracts.Assessment;
using Contracts.Assessment.Enums;
using Contracts.Grading.Models;

namespace Grading.Application.Strategies;

public sealed class ShortTextGrader : IQuestionGrader
{
    public QuestionType QuestionType => QuestionType.ShortText;

    public GradingResult Grade(AnswerPayload answer, QuestionData question)
    {
        if (string.IsNullOrWhiteSpace(answer.Text) || question.CorrectOptions.Count == 0)
            return GradingResult.Incorrect();

        var userAnswer = answer.Text.Trim();
        var isCorrect = question.CorrectOptions.Any(o =>
            string.Equals(o.Text?.Trim(), userAnswer, StringComparison.OrdinalIgnoreCase));

        return isCorrect 
            ? GradingResult.Correct(question.MaxPoints) 
            : GradingResult.Incorrect();
    }
}