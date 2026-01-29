using Application;
using Assessment.Application.DTOs.AI;
using Assessment.Application.Interfaces;
using Assessment.Domain.AI;
using BuildingBlocks.AI.Models;
using BuildingBlocks.AI.Services.Hints;
using BuildingBlocks.Api.Exceptions;
using Contracts.Assessment.Enums;
using MediatR;

namespace Assessment.Application.CQRS.AI;

public sealed record RequestAIHint(
    Guid AttemptId,
    Guid QuestionId,
    int HintLevel = 1
) : IRequest<HintResponseDto>;

public sealed class RequestAIHintHandler(
    IUserContext userContext,
    IAttemptRepository attempts,
    IQuestionRepository questions,
    ITestRepository tests,
    IHintUsageRepository hintUsages,
    IAIHintService aiHintService) : IRequestHandler<RequestAIHint, HintResponseDto>
{
    private const int MAX_HINTS_PER_ATTEMPT = 3;

    public async Task<HintResponseDto> Handle(RequestAIHint request, CancellationToken cancellationToken)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var attempt = await attempts.GetByIdAsync(request.AttemptId, cancellationToken)
                      ?? throw new EntityNotFoundException("Попытка не найдена.");

        if (attempt.UserId != userId)
            throw new ForbiddenException("Это не ваша попытка.");

        if (attempt.Status != AttemptStatus.InProgress)
            throw new InvalidOperationApiException("Попытка не активна.");

        var test = await tests.GetByIdAsync(attempt.TestId, cancellationToken)
                   ?? throw new EntityNotFoundException("���� �� ������.");

        if (!test.AllowAiHints)
            throw new InvalidOperationApiException("AI-�������� ��� ���� ���������.");

        var usedCount = await hintUsages.CountByAttemptAsync(request.AttemptId, cancellationToken);
        if (usedCount >= MAX_HINTS_PER_ATTEMPT)
            throw new InvalidOperationApiException($"Достигнут лимит подсказок ({MAX_HINTS_PER_ATTEMPT}).");

        var question = await questions.GetByIdAsync(request.QuestionId, cancellationToken)
                       ?? throw new EntityNotFoundException("Вопрос не найден.");

        var attemptWithAnswers = await attempts.GetWithAnswersAsync(request.AttemptId, cancellationToken);
        var existingAnswer = attemptWithAnswers?.Answers
            .FirstOrDefault(a => a.QuestionId == request.QuestionId);

        var aiResponse = await aiHintService.GenerateHintAsync(new HintRequest(
            question.Text,
            existingAnswer?.Answer.Text,
            request.HintLevel), cancellationToken);

        var hintUsage = new HintUsage(
            request.AttemptId,
            request.QuestionId,
            aiResponse!.Level,
            aiResponse.Hint);

        await hintUsages.AddAsync(hintUsage, cancellationToken);

        return new HintResponseDto(
            aiResponse.Hint,
            aiResponse.Level,
            usedCount + 1,
            MAX_HINTS_PER_ATTEMPT - usedCount - 1);
    }
}