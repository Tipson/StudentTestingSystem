using Assessment.Application.DTOs.Question;
using Assessment.Application.Interfaces;
using Assessment.Domain.Questions;
using Assessment.Domain.Tests;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Identity;
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

        await questions.AddAsync(question, ct);

        return question.Adapt<QuestionDto>();
    }
}