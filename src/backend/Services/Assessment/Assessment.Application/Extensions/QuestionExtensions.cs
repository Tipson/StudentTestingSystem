using Assessment.Application.DTOs.Question;

namespace Assessment.Application.Extensions;

public static class QuestionExtensions
{
    public static List<QuestionDto> HideCorrectAnswers(this List<QuestionDto> questions) =>
        questions.Select(q => q.HideCorrectAnswers()).ToList();

    public static QuestionDto HideCorrectAnswers(this QuestionDto question) =>
        question with
        {
            Options = question.Options.Select(o => o with { IsCorrect = null }).ToList()
        };
}