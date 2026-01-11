using Contracts.Assessment;
using Contracts.Assessment.Enums;
using Contracts.Grading.Models;

namespace Grading.Application.Strategies;

public sealed class SingleChoiceGrader : IQuestionGrader
{
    public QuestionType QuestionType => QuestionType.SingleChoice;

    public GradingResult Grade(AnswerPayload answer, QuestionData question)
    {
        if (answer.OptionId is null || question.CorrectOptions.Count == 0)
            return GradingResult.Incorrect();

        var isCorrect = question.CorrectOptions.Any(o => o.Id == answer.OptionId);
        
        return isCorrect 
            ? GradingResult.Correct(question.MaxPoints) 
            : GradingResult.Incorrect();
    }
}