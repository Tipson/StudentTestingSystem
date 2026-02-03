using Application;
using Contracts.Grading.Messages;
using Contracts.Grading.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Grading.Application.CQRS.Commands;

/// <summary>
/// Автоматически проверяет все ответы в попытке.
/// </summary>
public sealed record GradeAttempt(GradeAttemptRequest Request) : IRequest<GradeAttemptResponse>;

public sealed class GradeAttemptHandler(
    IGradingService gradingService,
    ILogger<GradeAttemptHandler> logger)
    : IRequestHandler<GradeAttempt, GradeAttemptResponse>
{
    public Task<GradeAttemptResponse> Handle(GradeAttempt request, CancellationToken ct)
    {
        logger.LogInformation("Начало проверки попытки {AttemptId}", request.Request.AttemptId);

        var results = new List<QuestionGradingResult>();

        // Проверяем каждый ответ
        foreach (var answer in request.Request.Answers)
        {
            var question = request.Request.Questions.FirstOrDefault(q => q.Id == answer.QuestionId);
            if (question is null)
            {
                logger.LogWarning("Вопрос {QuestionId} не найден для попытки {AttemptId}", 
                    answer.QuestionId, request.Request.AttemptId);
                continue;
            }

            var gradingResult = gradingService.GradeAnswer(answer.Payload, question);
            results.Add(new QuestionGradingResult(answer.QuestionId, gradingResult));

            logger.LogDebug("Вопрос {QuestionId} проверен: {Points}/{MaxPoints}, Тип: {Type}",
                answer.QuestionId, gradingResult.PointsAwarded, question.MaxPoints, gradingResult.Type);
        }

        // Обрабатываем вопросы без ответов
        var answeredQuestionIds = request.Request.Answers.Select(a => a.QuestionId).ToHashSet();
        foreach (var question in request.Request.Questions.Where(q => !answeredQuestionIds.Contains(q.Id)))
        {
            results.Add(new QuestionGradingResult(question.Id, GradingResult.Incorrect()));
        }

        // Подсчитываем итоговый балл
        var gradingResults = results.Select(r => r.Result).ToList();
        var (score, totalPoints, earnedPoints) = gradingService.CalculateScore(
            gradingResults, 
            request.Request.Questions);

        logger.LogInformation(
            "Проверка попытки {AttemptId} завершена: {EarnedPoints}/{TotalPoints} ({Score}%)",
            request.Request.AttemptId, earnedPoints, totalPoints, score);

        return Task.FromResult(new GradeAttemptResponse(
            request.Request.AttemptId,
            results,
            totalPoints,
            earnedPoints,
            score));
    }
}
