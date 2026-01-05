using Assessment.Application.DTOs.Question;
using Assessment.Application.Extensions;
using Assessment.Application.Interfaces;
using Assessment.Domain.Tests;
using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Questions.Queries;

public sealed record GetQuestion(Guid QuestionId) : IRequest<QuestionDto>;

public sealed class GetQuestionHandler(
    IUserContext userContext,
    IQuestionRepository questionRepository,
    ITestRepository testRepository)
    : IRequestHandler<GetQuestion, QuestionDto>
{
    public async Task<QuestionDto> Handle(GetQuestion request, CancellationToken ct)
    {
        var question = await questionRepository.GetByIdAsync(request.QuestionId, ct)
                       ?? throw new EntityNotFoundException("Вопрос не найден.");

        var test = await testRepository.GetByIdAsync(question.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        var isOwner = test.OwnerUserId == userContext.UserId;

        if (!isOwner && test.Status != TestStatus.Published)
            throw new ForbiddenException("Тест недоступен.");

        var result = question.Adapt<QuestionDto>();

        return isOwner ? result : result.HideCorrectAnswers();
    }
}