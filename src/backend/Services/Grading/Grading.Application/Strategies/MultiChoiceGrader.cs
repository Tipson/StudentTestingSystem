using Contracts.Assessment;
using Contracts.Assessment.Enums;
using Contracts.Grading.Models;

namespace Grading.Application.Strategies;

public sealed class MultiChoiceGrader : IQuestionGrader
{
    public QuestionType QuestionType => QuestionType.MultiChoice;

    public GradingResult Grade(AnswerPayload answer, QuestionData question)
    {
        if (answer.OptionIds is null || answer.OptionIds.Count == 0 || question.CorrectOptions.Count == 0)
            return GradingResult.Incorrect();

        var correctIds = question.CorrectOptions.Select(o => o.Id).ToHashSet();
        var selectedIds = answer.OptionIds.ToHashSet();

        var isCorrect = correctIds.SetEquals(selectedIds);
        
        return isCorrect 
            ? GradingResult.Correct(question.MaxPoints) 
            : GradingResult.Incorrect();
    }
}