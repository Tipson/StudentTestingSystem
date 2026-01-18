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

        var attempt = await attempts.GetWithAnswersAsync(request.AttemptId, ct)
                      ?? throw new EntityNotFoundException("Попытка не найдена");

        if (attempt.UserId != userId)
            throw new ForbiddenException("Нет доступа к этой попытке");

        if (attempt.Status != AttemptStatus.InProgress)
            throw new BadRequestApiException("Попытка уже завершена");

        var test = await tests.GetByIdAsync(attempt.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден");

        if (attempt.IsTimeExpired(test.TimeLimitSeconds))
            throw new BadRequestApiException("Время на прохождение теста истекло");

        var testQuestions = await questions.ListByTestIdAsync(test.Id, ct);

        // Формируем запрос для Grading Service
        var gradingRequest = new GradeAttemptRequest(
            request.AttemptId,
            attempt.Answers.Select(a => new AnswerData
            {
                QuestionId = a.QuestionId,
                Payload = a.Answer
            }).ToList(),
            testQuestions.Select(q => new QuestionData
            {
                Id = q.Id,
                Type = q.Type,
                Text = q.Text,
                MaxPoints = q.Points,
                CorrectOptions = q.Options
                    .Where(o => o.IsCorrect)
                    .Select(o => new CorrectOptionData
                    {
                        Id = o.Id,
                        Text = o.Text
                    })
                    .ToList()
            }).ToList()
        );

        // Отправляем на проверку в Grading Service
        var gradingResponse = await gradingClient.GradeAttemptAsync(gradingRequest, ct);

        // Обновляем ответы результатами проверки
        foreach (var result in gradingResponse.Results)
        {
            var answer = attempt.Answers.FirstOrDefault(a => a.QuestionId == result.QuestionId);
            if (answer is not null)
            {
                answer.SetResult(result.Result.IsCorrect, result.Result.PointsAwarded);
                answer.ManualGradingRequired = result.Result.RequiresManualReview;
                
                // Сохраняем AI feedback если есть
                if (!string.IsNullOrEmpty(result.Result.Feedback))
                {
                    answer.Feedback = result.Result.Feedback;
                }
            }
        }

        var correctCount = gradingResponse.Results.Count(r => r.Result.IsCorrect);

        // Сохраняем результат
        attempt.Submit(gradingResponse.EarnedPoints, test.PassScore);
        await attempts.UpdateAsync(attempt, ct);

        var requiresManualReview = gradingResponse.Results
            .Any(r => r.Result.RequiresManualReview);

        // Формируем результат
        var questionResults = testQuestions
            .Select(q =>
            {
                var answer = attempt.Answers.FirstOrDefault(a => a.QuestionId == q.Id);
                return mapper.Map<QuestionResultDto>((q, answer));
            })
            .ToList();

        return new AttemptResultDto(
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
    }
}