using Contracts.Assessment;
using Contracts.Assessment.Enums;
using Contracts.Grading.Models;

namespace Grading.Application.Strategies;

public interface IQuestionGrader
{
    /// <summary>
    /// Тип вопроса, который обрабатывает этот grader.
    /// </summary>
    QuestionType QuestionType { get; }
    
    /// <summary>
    /// Проверить ответ.
    /// </summary>
    GradingResult Grade(AnswerPayload answer, QuestionData question);
}