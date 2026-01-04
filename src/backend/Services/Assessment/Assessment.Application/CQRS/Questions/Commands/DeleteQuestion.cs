using Assessment.Application.Interfaces;
using Assessment.Domain.Tests;
using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using MediatR;

namespace Assessment.Application.CQRS.Questions.Commands;

public sealed record DeleteQuestion(Guid QuestionId) : IRequest;

public sealed class DeleteQuestionHander(
    IQuestionRepository questionRepository,
    ITestRepository testRepository,
    IUserContext userContext) : IRequestHandler<DeleteQuestion>
{
    public async Task Handle(DeleteQuestion request, CancellationToken cancellationToken)
    {
        var question = await questionRepository.GetByIdAsync(request.QuestionId, cancellationToken) 
                       ?? throw new EntityNotFoundException($"Вопрос {request.QuestionId} не найден");
        
        var test = await testRepository.GetByIdAsync(question.TestId, cancellationToken)
                   ?? throw new EntityNotFoundException($"Тест {question.TestId} не найден");
        
        if (test.OwnerUserId != userContext.UserId)
            throw new ForbiddenException("Недостаточно прав");

        if (test.Status == TestStatus.Published)
            throw new InvalidOperationException("Нельзя удалять вопросы опубликованного теста");

        await questionRepository.DeleteAsync(question, cancellationToken);
    }
}