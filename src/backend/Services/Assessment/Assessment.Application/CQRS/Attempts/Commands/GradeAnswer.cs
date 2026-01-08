using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using Assessment.Domain.Attempts;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Identity;
using MediatR;

namespace Assessment.Application.CQRS.Attempts.Commands;

public record GradeAnswer(Guid AttemptId,
    Guid QuestionId,
    GradeAnswerDto Dto) : IRequest;

public class GradeAnswerHandler(IUserContext userContext, IAttemptRepository attempts, ITestRepository tests, IQuestionRepository questions)  : IRequestHandler<GradeAnswer>
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

        if (request.Dto.Points < 0 || request.Dto.Points > question.Points)
            throw new BadRequestApiException($"Баллы должны быть от 0 до {question.Points}");

        var answer = attempt.Answers.FirstOrDefault(a => a.QuestionId == request.QuestionId)
                     ?? throw new EntityNotFoundException("Ответ не найден");

        if (!answer.ManualGradingRequired)
            throw new BadRequestApiException("Этот ответ не требует ручной проверки");

        answer.SetManualGrade(request.Dto.Points, request.Dto.Comment);

        // Пересчитываем общий балл попытки
        var earnedPoints = attempt.Answers.Sum(a => a.PointsAwarded ?? 0);
        var totalPoints = test.Questions.Sum(q => q.Points);
        var score = totalPoints > 0 ? (int)Math.Round((double)earnedPoints / totalPoints * 100) : 0;
        
        attempt.UpdateScore(score, test.PassScore);

        await attempts.UpdateAsync(attempt, ct);
    }    
}
