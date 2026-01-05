using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using Assessment.Domain.Attempts;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Identity;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Attempts.Commands;

/// <summary>
/// Сохранить ответ на вопрос в рамках попытки.
/// </summary>
public sealed record SaveAnswer(Guid AttemptId, Guid QuestionId, SaveAnswerDto Dto) : IRequest<AttemptAnswerDto>;

public sealed class SaveAnswerHandler(
    IUserContext userContext,
    IAttemptRepository attempts,
    ITestRepository tests,
    IQuestionRepository questions) : IRequestHandler<SaveAnswer, AttemptAnswerDto>
{
    public async Task<AttemptAnswerDto> Handle(SaveAnswer request, CancellationToken cancellationToken)
    {
        var userId = userContext.UserId 
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

            
        // Загружаем попытку с ответами
        var attempt = await attempts.GetWithAnswersAsync(request.AttemptId, cancellationToken)
                      ?? throw new EntityNotFoundException("Попытка не найдена");

        if (attempt.UserId != userId)
            throw new ForbiddenException("Нет доступа к этой попытке");

        if (attempt.Status != AttemptStatus.InProgress)
            throw new BadRequestApiException("Попытка уже завершена");

        // Загружаем тест для проверки времени
        var test = await tests.GetByIdAsync(attempt.TestId, cancellationToken)
                   ?? throw new EntityNotFoundException("Тест не найден");

        // Проверка времени
        if (attempt.IsTimeExpired(test.TimeLimitSeconds))
            throw new BadRequestApiException("Время на прохождение теста истекло");

        // Проверяем, что вопрос принадлежит тесту
        var question = await questions.GetByIdAsync(request.QuestionId, cancellationToken)
                       ?? throw new EntityNotFoundException("Вопрос не найден");

        if (question.TestId != attempt.TestId)
            throw new BadRequestApiException("Вопрос не относится к данному тесту");

        // Создаём payload
        var payload = new AnswerPayload
        {
            OptionId = request.Dto.OptionId,
            OptionIds = request.Dto.OptionIds,
            Text = request.Dto.Text
        };

        // Сохраняем ответ
        var saved = attempt.SetAnswer(request.QuestionId, payload);
        await attempts.UpdateAsync(attempt, cancellationToken);

        return saved.Adapt<AttemptAnswerDto>();
    }
}