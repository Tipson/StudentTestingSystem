using Application;
using Contracts.Grading.Messages;
using Contracts.Grading.Models;
using Microsoft.Extensions.Logging;

namespace Grading.Application.Services;

public sealed class GradingOrchestrator(
    IGradingService gradingService,
    ILogger<GradingOrchestrator> logger)
    : IGradingOrchestrator
{
    public async Task<GradeAttemptResponse> GradeAttemptAsync(GradeAttemptRequest request, CancellationToken ct = default)
    {
        logger.LogInformation("Начало проверки попытки {AttemptId}", request.AttemptId);

        var results = new List<QuestionGradingResult>();

        // Проверяем каждый ответ
        foreach (var answer in request.Answers)
        {
            var question = request.Questions.FirstOrDefault(q => q.Id == answer.QuestionId);
            if (question is null)
            {
                logger.LogWarning("Вопрос {QuestionId} не найден для попытки {AttemptId}", 
                    answer.QuestionId, request.AttemptId);
                continue;
            }

            var gradingResult = gradingService.GradeAnswer(answer.Payload, question);
            results.Add(new QuestionGradingResult(answer.QuestionId, gradingResult));

            logger.LogDebug("Вопрос {QuestionId} проверен: {Points}/{MaxPoints}, Тип: {Type}",
                answer.QuestionId, gradingResult.PointsAwarded, question.MaxPoints, gradingResult.Type);
        }

        // Обрабатываем вопросы без ответов
        var answeredQuestionIds = request.Answers.Select(a => a.QuestionId).ToHashSet();
        foreach (var question in request.Questions.Where(q => !answeredQuestionIds.Contains(q.Id)))
        {
            results.Add(new QuestionGradingResult(question.Id, GradingResult.Incorrect()));
        }

        // Подсчитываем итоговый балл
        var gradingResults = results.Select(r => r.Result).ToList();
        var (score, totalPoints, earnedPoints) = gradingService.CalculateScore(
            gradingResults, 
            request.Questions);

        logger.LogInformation(
            "Проверка попытки {AttemptId} завершена: {EarnedPoints}/{TotalPoints} ({Score}%)",
            request.AttemptId, earnedPoints, totalPoints, score);

        return new GradeAttemptResponse(
            request.AttemptId,
            results,
            totalPoints,
            earnedPoints,
            score);
    }
}