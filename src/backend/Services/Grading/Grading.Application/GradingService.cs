using Application;
using Contracts.Assessment;
using Contracts.Assessment.Enums;
using Contracts.Grading.Models;
using Grading.Application.Strategies;

namespace Grading.Application;

public sealed class GradingService : IGradingService
{
    private readonly Dictionary<QuestionType, IQuestionGrader> _graders;

    public GradingService(IEnumerable<IQuestionGrader> graders)
    {
        _graders = graders.ToDictionary(g => g.QuestionType);
        
        // TrueFalse — это SingleChoice с двумя вариантами (Правда/Ложь)
        if (_graders.TryGetValue(QuestionType.SingleChoice, out var singleChoiceGrader))
        {
            _graders[QuestionType.TrueFalse] = singleChoiceGrader;
        }
    }
    
    /// <summary>
    /// Автоматическая проверка ответа студента на вопрос.
    /// </summary>
    public GradingResult GradeAnswer(AnswerPayload answer, QuestionData question)
    {
        if (!_graders.TryGetValue(question.Type, out var grader))
            throw new NotSupportedException($"Тип вопроса {question.Type} не поддерживается");

        return grader.Grade(answer, question);
    }

    /// <summary>
    /// Ручная оценка ответа преподавателем (для LongText).
    /// </summary>
    public GradingResult GradeManually(int points, int maxPoints, string? comment = null)
    {
        if (points < 0 || points > maxPoints)
            throw new ArgumentException($"Баллы должны быть от 0 до {maxPoints}", nameof(points));

        return GradingResult.Manual(points, comment);
    }

    /// <summary>
    /// Рассчитывает итоговый балл попытки в процентах (0-100).
    /// </summary>
    public (int Score, int TotalPoints, int EarnedPoints) CalculateScore(
        List<GradingResult> results,
        List<QuestionData> questions)
    {
        var totalPoints = questions.Sum(q => q.MaxPoints);
        var earnedPoints = results.Sum(r => r.PointsAwarded);

        var score = totalPoints > 0
            ? (int)Math.Round((double)earnedPoints / totalPoints * 100)
            : 0;

        return (score, totalPoints, earnedPoints);
    }
}