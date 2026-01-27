using Application;
using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Assessment.Enums;
using Contracts.Grading.Messages;
using Contracts.Grading.Models;
using MapsterMapper;
using MediatR;

namespace Assessment.Application.CQRS.Attempts.Commands;

public sealed record SubmitAttempt(Guid AttemptId) : IRequest<AttemptResultDto>;

public sealed class SubmitAttemptHandler(
    IUserContext userContext,
    IUnitOfWork unitOfWork,
    IAttemptRepository attempts,
    ITestRepository tests,
    IQuestionRepository questions,
    IGradingClient gradingClient,
    IMapper mapper)
    : IRequestHandler<SubmitAttempt, AttemptResultDto>
{
    public async Task<AttemptResultDto> Handle(SubmitAttempt request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        // Используем UnitOfWork для обеспечения транзакционности всей операции
        AttemptResultDto result = null!;
        
        await unitOfWork.ExecuteAsync(async (cancellationToken) =>
        {
            var attempt = await attempts.GetWithAnswersAsync(request.AttemptId, cancellationToken)
                          ?? throw new EntityNotFoundException("Попытка не найдена");

            if (attempt.UserId != userId)
                throw new ForbiddenException("Нет доступа к этой попытке");

            if (attempt.Status != AttemptStatus.InProgress)
                throw new BadRequestApiException("Попытка уже завершена");

            var test = await tests.GetByIdAsync(attempt.TestId, cancellationToken)
                       ?? throw new EntityNotFoundException("Тест не найден");

            if (attempt.IsTimeExpired(test.TimeLimitSeconds))
                throw new BadRequestApiException("Время на прохождение теста истекло");

            var testQuestions = await questions.ListByTestIdAsync(test.Id, cancellationToken);

            // ИСПРАВЛЕНИЕ N+1: Создаем словарь для O(1) поиска ответов по QuestionId
            var answersByQuestionId = attempt.Answers.ToDictionary(a => a.QuestionId);

            // ✅ MAPSTER: Формируем запрос для Grading Service через маппер
            var gradingRequest = new GradeAttemptRequest(
                request.AttemptId,
                mapper.Map<List<AnswerData>>(attempt.Answers),
                mapper.Map<List<QuestionData>>(testQuestions)
            );

            // Отправляем на проверку в Grading Service
            var gradingResponse = await gradingClient.GradeAttemptAsync(gradingRequest, cancellationToken);

            // ИСПРАВЛЕНИЕ N+1: Используем Dictionary для O(1) доступа вместо FirstOrDefault в цикле
            foreach (var gradeResult in gradingResponse.Results)
            {
                if (answersByQuestionId.TryGetValue(gradeResult.QuestionId, out var answer))
                {
                    answer.SetResult(gradeResult.Result.IsCorrect, gradeResult.Result.PointsAwarded);
                    answer.ManualGradingRequired = gradeResult.Result.RequiresManualReview;
                    
                    // Сохраняем AI feedback если есть
                    if (!string.IsNullOrEmpty(gradeResult.Result.Feedback))
                    {
                        answer.Feedback = gradeResult.Result.Feedback;
                    }
                }
            }

            var correctCount = gradingResponse.Results.Count(r => r.Result.IsCorrect);

            // Сохраняем результат
            attempt.Submit(gradingResponse.EarnedPoints, test.PassScore);
            await attempts.UpdateAsync(attempt, cancellationToken);

            var requiresManualReview = gradingResponse.Results
                .Any(r => r.Result.RequiresManualReview);

            // ИСПРАВЛЕНИЕ N+1: Используем Dictionary для O(1) доступа при формировании результата
            var questionResults = testQuestions
                .Select(q =>
                {
                    answersByQuestionId.TryGetValue(q.Id, out var answer);
                    return mapper.Map<QuestionResultDto>((q, answer));
                })
                .ToList();

            result = new AttemptResultDto(
                attempt.Id,
                test.Id,
                test.Title,
                gradingResponse.EarnedPoints,
                test.PassScore,
                attempt.IsPassed ?? false,
                requiresManualReview,
                gradingResponse.TotalPoints,
                gradingResponse.EarnedPoints,
                testQuestions.Count,
                correctCount,
                attempt.StartedAt,
                attempt.SubmittedAt ?? DateTimeOffset.UtcNow,
                (attempt.SubmittedAt ?? DateTimeOffset.UtcNow) - attempt.StartedAt,
                questionResults
            );
        }, ct);

        return result;
    }
}
