// Assessment.Application/CQRS/Questions/Queries/GetQuestion.cs
using MediatR;
using Assessment.Application.DTOs.Question;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using Mapster;

namespace Assessment.Application.CQRS.Questions.Queries;

public sealed record GetQuestion(Guid QuestionId) : IRequest<QuestionDto>;

public sealed class GetQuestionHandler(
    IQuestionRepository questionRepository,
    ITestRepository testRepository,
    IUserContext userContext)
    : IRequestHandler<GetQuestion, QuestionDto>
{
    public async Task<QuestionDto> Handle(GetQuestion request, CancellationToken ct)
    {
        var question = await questionRepository.GetByIdAsync(request.QuestionId, ct)
                       ?? throw new EntityNotFoundException($"Вопрос {request.QuestionId} не найден");

        var test = await testRepository.GetByIdAsync(question.TestId, ct)
                   ?? throw new EntityNotFoundException($"Тест {question.TestId} не найден");

        if (test.OwnerUserId != userContext.UserId)
            throw new ForbiddenException("Недостаточно прав");

        return question.Adapt<QuestionDto>();    }
}