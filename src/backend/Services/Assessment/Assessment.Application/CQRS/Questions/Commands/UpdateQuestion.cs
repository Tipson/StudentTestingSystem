// Assessment.Application/CQRS/Questions/Commands/UpdateQuestion.cs
using MediatR;
using Assessment.Application.DTOs.Question;
using Assessment.Application.Interfaces;
using Assessment.Domain.Questions;
using Assessment.Domain.Tests;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Identity;
using Mapster;

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

        // Обновляем вопрос
        question.UpdateText(request.Dto.Text);
        question.UpdatePoints(request.Dto.Points);
        
        // Обновляем варианты ответов
        question.UpdateOptions(request.Dto.Options.Select(o => new QuestionOption
        {
            Text = o.Text,
            IsCorrect = o.IsCorrect,
            Order = o.Order
        }).ToList());

        await questionRepository.UpdateAsync(question, ct);

        return question.Adapt<QuestionDto>();
    }
}