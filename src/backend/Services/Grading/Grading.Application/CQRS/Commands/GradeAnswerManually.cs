using Application;
using Contracts.Grading.Messages;
using Contracts.Grading.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Grading.Application.CQRS.Commands;

/// <summary>
/// Вручную проверяет один ответ и пересчитывает общий балл попытки.
/// </summary>
public sealed record GradeAnswerManually(ManualGradeRequest Request) : IRequest<ManualGradeResponse>;

public sealed class GradeAnswerManuallyHandler(
    IGradingService gradingService,
    ILogger<GradeAnswerManuallyHandler> logger)
    : IRequestHandler<GradeAnswerManually, ManualGradeResponse>
{
    public Task<ManualGradeResponse> Handle(GradeAnswerManually request, CancellationToken ct)
    {
        logger.LogInformation(
            "Ручная проверка ответа на вопрос {QuestionId} в попытке {AttemptId}",
            request.Request.QuestionId, request.Request.AttemptId);

        // Создаем результат ручной проверки
        var gradingResult = gradingService.GradeManually(
            request.Request.Points, 
            request.Request.MaxPoints, 
            request.Request.Comment);

        // Пересчитываем общий балл попытки
        var updatedAnswers = request.Request.AllAnswers
            .Select(a => a.QuestionId == request.Request.QuestionId
                ? a with { PointsAwarded = gradingResult.PointsAwarded }
                : a)
            .Select(a => GradingResult.Manual(a.PointsAwarded, null))
            .ToList();

        var questions = request.Request.AllQuestions
            .Select(q => new QuestionData
            {
                Id = q.QuestionId,
                MaxPoints = q.MaxPoints
            })
            .ToList();

        var (scorePercentage, totalMaxPoints, totalEarnedPoints) = 
            gradingService.CalculateScore(updatedAnswers, questions);

        logger.LogInformation(
            "Ручная проверка завершена: {QuestionId} получил {Points}/{MaxPoints}. " +
            "Общий балл попытки: {EarnedPoints}/{TotalPoints} ({Score}%)",
            request.Request.QuestionId, gradingResult.PointsAwarded, request.Request.MaxPoints,
            totalEarnedPoints, totalMaxPoints, scorePercentage);

        var response = new ManualGradeResponse(
            request.Request.AttemptId,
            request.Request.QuestionId,
            gradingResult.PointsAwarded,
            gradingResult.Feedback,
            totalEarnedPoints,
            totalMaxPoints,
            scorePercentage);

        return Task.FromResult(response);
    }
}
