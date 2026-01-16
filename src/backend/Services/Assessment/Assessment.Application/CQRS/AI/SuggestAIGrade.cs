using Assessment.Application.DTOs.AI;
using Assessment.Application.Interfaces;
using BuildingBlocks.AI.Models;
using BuildingBlocks.AI.Services.Grading;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Integrations.Gemini;
using MediatR;

namespace Assessment.Application.CQRS.AI;

public sealed record SuggestAIGrade(
    Guid AttemptId,
    Guid AnswerId
) : IRequest<GradingSuggestionDto>;

public sealed class SuggestAIGradeHandler(
    IAttemptRepository attempts,
    IQuestionRepository questions,
    IAIGradingService gradingService) : IRequestHandler<SuggestAIGrade, GradingSuggestionDto>
{
    public async Task<GradingSuggestionDto> Handle(SuggestAIGrade request, CancellationToken cancellationToken)
    {
        var attempt = await attempts.GetWithAnswersAsync(request.AnswerId, cancellationToken)
                      ?? throw new EntityNotFoundException("Попытка не найдена");
        
        var answer = attempt.Answers.FirstOrDefault(x => x.Id == request.AnswerId)
                     ?? throw new EntityNotFoundException("Ответ не найден");
        
        var question  = await questions.GetByIdAsync(answer.QuestionId, cancellationToken)
                        ?? throw new EntityNotFoundException("Вопрос не найден");

        var aiResponse = await gradingService.SuggestGradeAsync(new GradingRequest(
            question.Text,
            null,
            answer.Answer.Text,
            question.Points), cancellationToken); //Todo Ситуативно, добавить правильный ответ
        
        if (aiResponse is null)
            throw new InvalidOperationApiException("AI сервис проверки временно недоступен.");

        return new GradingSuggestionDto(
            aiResponse.Points,
            aiResponse.Comment,
            aiResponse.Confidence);
    }
}