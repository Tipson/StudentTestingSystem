using Application;
using Assessment.Application.DTOs.Question;
using Assessment.Application.Interfaces;
using Assessment.Domain.Questions;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Assessment.Enums;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Questions.Commands;

public sealed record UpdateQuestion(Guid QuestionId, UpdateQuestionDto Dto) : IRequest<QuestionDto>;

public sealed class UpdateQuestionHandler(
    IQuestionRepository questionRepository,
    ITestRepository testRepository,
    IUserContext userContext)
    : IRequestHandler<UpdateQuestion, QuestionDto>
{
    public async Task<QuestionDto> Handle(UpdateQuestion request, CancellationToken ct)
    {
        var question = await questionRepository.GetByIdAsync(request.QuestionId, ct)
                       ?? throw new EntityNotFoundException($"Вопрос {request.QuestionId} не найден");

        var test = await testRepository.GetByIdAsync(question.TestId, ct)
                   ?? throw new EntityNotFoundException($"Тест {question.TestId} не найден");

        if (test.OwnerUserId != userContext.UserId)
            throw new ForbiddenException("Недостаточно прав");

        if (test.Status == TestStatus.Published)
            throw new BadRequestApiException("Нельзя редактировать вопросы опубликованного теста");

        // Обновляем базовые поля через методы сущности
        question.UpdateText(request.Dto.Text);
        question.UpdatePoints(request.Dto.Points);

        // Обновляем варианты ответов
        var options = CreateOptions(request.Dto.Options);
        question.UpdateOptions(options);

        // Обновляем медиа вопроса
        if (request.Dto.MediaIds is not null)
        {
            question.SetMedia(request.Dto.MediaIds);
        }

        await questionRepository.UpdateAsync(question, ct);

        return question.Adapt<QuestionDto>();
    }

    private static IEnumerable<QuestionOption> CreateOptions(List<UpdateQuestionOptionDto> optionDtos)
    {
        var order = 1;
        foreach (var dto in optionDtos)
        {
            var option = new QuestionOption
            {
                Text = dto.Text,
                IsCorrect = dto.IsCorrect,
                Order = dto.Order > 0 ? dto.Order : order++
            };

            if (dto.MediaIds is { Count: > 0 })
            {
                option.SetMedia(dto.MediaIds);
            }

            yield return option;
        }
    }
}