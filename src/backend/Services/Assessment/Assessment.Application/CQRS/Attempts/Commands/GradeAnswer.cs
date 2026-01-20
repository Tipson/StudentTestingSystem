using Application;
using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Assessment.Enums;
using Contracts.Grading.Models;
using MapsterMapper;
using MediatR;

namespace Assessment.Application.CQRS.Attempts.Commands;

/// <summary>
/// Пересчитывает ответ вручную и возвращает обновлённый счёт.
/// </summary>
public sealed record GradeAnswer(
    Guid AttemptId,
    Guid QuestionId,
    GradeAnswerDto Dto
 ) : IRequest<AttemptScoreDto>;

public sealed class GradeAnswerHandler(
    IUserContext userContext,
    IAttemptRepository attempts,
    ITestRepository tests,
    IQuestionRepository questions,
    IGradingService? grading,
    IMapper mapper)
    : IRequestHandler<GradeAnswer, AttemptScoreDto>
{
    public async Task<AttemptScoreDto> Handle(GradeAnswer request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не авторизован.");

        var attempt = await attempts.GetWithAnswersAsync(request.AttemptId, ct)
                      ?? throw new EntityNotFoundException("Попытка не найдена");

        var test = await tests.GetByIdAsync(attempt.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден");

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Можно оценивать только свои тесты");

        if (attempt.Status != AttemptStatus.Submitted)
            throw new BadRequestApiException("Попытка ещё не завершена");

        var question = await questions.GetByIdAsync(request.QuestionId, ct)
                       ?? throw new EntityNotFoundException("Вопрос не найден");

        if (question.TestId != attempt.TestId)
            throw new BadRequestApiException("Вопрос не относится к этому тесту");

        var answer = attempt.Answers.FirstOrDefault(a => a.QuestionId == request.QuestionId)
                     ?? throw new EntityNotFoundException("Ответ не найден");

        /*if (!answer.ManualGradingRequired)
            throw new BadRequestApiException("Этот ответ не требует ручной проверки");*/

        if (request.Dto.Points < 0)
            throw new BadRequestApiException("Количество баллов не может быть отрицательным.");

        if (request.Dto.Points > question.Points)
            throw new BadRequestApiException($"Максимум за этот вопрос: {question.Points}.");

        var gradingService = grading ?? throw new InvalidOperationException("Grading service is not available");

        var gradingResult = gradingService.GradeManually(request.Dto.Points, question.Points, request.Dto.Comment);

        answer.SetManualGrade(gradingResult.PointsAwarded, gradingResult.Feedback);

        var testQuestions = await questions.ListByTestIdAsync(attempt.TestId, ct);

        var gradingResults = attempt.Answers
            .Select(mapper.Map<GradingResult>)
            .ToList();

        var questionsData = testQuestions
            .Select(mapper.Map<QuestionData>)
            .ToList();

        var (_, _, earnedPoints) = gradingService.CalculateScore(gradingResults, questionsData);

        attempt.UpdateScore(earnedPoints, test.PassScore);

        await attempts.UpdateAsync(attempt, ct);

        return new AttemptScoreDto(
            attempt.Id,
            attempt.TestId,
            earnedPoints,
            test.PassScore,
            attempt.IsPassed ?? false
        );
    }
}
