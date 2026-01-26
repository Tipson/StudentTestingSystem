using Application;
using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Assessment.Enums;
using Contracts.Grading.Messages;
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
    IGradingClient gradingClient,
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

        var testQuestions = await questions.ListByTestIdAsync(attempt.TestId, ct);

        // Формируем запрос на ручную проверку в Grading Service
        var gradingRequest = new ManualGradeRequest(
            AttemptId: request.AttemptId,
            QuestionId: request.QuestionId,
            Points: request.Dto.Points,
            MaxPoints: question.Points,
            Comment: request.Dto.Comment,
            AllAnswers: mapper.Map<List<AnswerResult>>(attempt.Answers),
            AllQuestions: mapper.Map<List<QuestionInfo>>(testQuestions)
        );

        // Отправляем в Grading Service
        var gradingResponse = await gradingClient.GradeAnswerManuallyAsync(gradingRequest, ct);

        // Сохраняем результат проверки
        answer.SetManualGrade(gradingResponse.PointsAwarded, gradingResponse.Feedback);

        // Обновляем общий балл попытки
        attempt.UpdateScore(gradingResponse.TotalEarnedPoints, test.PassScore);

        await attempts.UpdateAsync(attempt, ct);

        return new AttemptScoreDto(
            attempt.Id,
            attempt.TestId,
            gradingResponse.TotalEarnedPoints,
            test.PassScore,
            attempt.IsPassed ?? false
        );
    }
}
