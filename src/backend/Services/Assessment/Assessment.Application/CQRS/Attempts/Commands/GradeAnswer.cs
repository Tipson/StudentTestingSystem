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

public sealed record GradeAnswer(
    Guid AttemptId,
    Guid QuestionId,
    GradeAnswerDto Dto
) : IRequest;

public sealed class GradeAnswerHandler(
    IUserContext userContext,
    IAttemptRepository attempts,
    ITestRepository tests,
    IQuestionRepository questions,
    IGradingService? grading,
    IMapper mapper)
    : IRequestHandler<GradeAnswer>
{
    public async Task Handle(GradeAnswer request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var attempt = await attempts.GetWithAnswersAsync(request.AttemptId, ct)
                      ?? throw new EntityNotFoundException("Попытка не найдена");

        var test = await tests.GetByIdAsync(attempt.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден");

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Только владелец теста может оценивать ответы");

        if (attempt.Status != AttemptStatus.Submitted)
            throw new BadRequestApiException("Можно оценивать только завершённые попытки");

        var question = await questions.GetByIdAsync(request.QuestionId, ct)
                       ?? throw new EntityNotFoundException("Вопрос не найден");

        if (question.TestId != attempt.TestId)
            throw new BadRequestApiException("Вопрос не относится к данному тесту");

        var answer = attempt.Answers.FirstOrDefault(a => a.QuestionId == request.QuestionId)
                     ?? throw new EntityNotFoundException("Ответ не найден");

        if (!answer.ManualGradingRequired)
            throw new BadRequestApiException("Этот ответ не требует ручной проверки");

        // Используем GradingService для валидации и создания результата
        var gradingResult = grading?.GradeManually(request.Dto.Points, question.Points, request.Dto.Comment);

        // Обновляем ответ
        if (gradingResult != null) answer.SetManualGrade(gradingResult.PointsAwarded, gradingResult.Feedback);

        // Пересчитываем баллы через GradingService
        var testQuestions = await questions.ListByTestIdAsync(attempt.TestId, ct);

        var gradingResults = attempt.Answers
            .Select(mapper.Map<GradingResult>)
            .ToList();

        var questionsData = testQuestions
            .Select(mapper.Map<QuestionData>)
            .ToList();

        var (score, _, _) = grading.CalculateScore(gradingResults, questionsData);

        attempt.UpdateScore(score, test.PassScore);

        await attempts.UpdateAsync(attempt, ct);
    }
}