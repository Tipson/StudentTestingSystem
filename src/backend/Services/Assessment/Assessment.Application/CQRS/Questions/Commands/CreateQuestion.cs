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

/// <summary>
/// Создаёт вопрос для теста.
/// </summary>
public sealed record CreateQuestion(Guid TestId, CreateQuestionDto Dto) : IRequest<QuestionDto>;

public sealed class CreateQuestionHandler(
    IUserContext userContext,
    ITestRepository tests,
    IQuestionRepository questions)
    : IRequestHandler<CreateQuestion, QuestionDto>
{
    public async Task<QuestionDto> Handle(CreateQuestion request, CancellationToken ct)
    {
        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден");

        if (test.OwnerUserId != userContext.UserId)
            throw new ForbiddenException("Нет прав на изменение теста");

        if (test.Status != TestStatus.Draft)
            throw new BadRequestApiException("Вопросы можно менять только в статусе «Черновик»");

        var order = await questions.GetNextOrderAsync(test.Id, ct);

        var question = new Question(
            test.Id,
            request.Dto.Text,
            request.Dto.Type,
            order,
            request.Dto.IsRequired,
            request.Dto.Points
        );

        // Добавляем варианты ответов
        if (request.Dto.Options is { Count: > 0 })
        {
            var options = CreateOptions(request.Dto.Options);
            question.UpdateOptions(options);
        }

        // Добавляем медиа к вопросу
        if (request.Dto.MediaIds is { Count: > 0 })
        {
            question.SetMedia(request.Dto.MediaIds);
        }

        await questions.AddAsync(question, ct);

        return question.Adapt<QuestionDto>();
    }

    private static IEnumerable<QuestionOption> CreateOptions(List<CreateQuestionOptionDto> optionDtos)
    {
        var optionOrder = 1;
        foreach (var dto in optionDtos)
        {
            var option = new QuestionOption
            {
                Text = dto.Text,
                IsCorrect = dto.IsCorrect,
                Order = dto.Order > 0 ? dto.Order : optionOrder++
            };

            if (dto.MediaIds is { Count: > 0 })
            {
                option.SetMedia(dto.MediaIds);
            }

            yield return option;
        }
    }
}