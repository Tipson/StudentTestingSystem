using Assessment.Application.DTOs.Question;
using Assessment.Application.Extensions;
using Assessment.Application.Interfaces;
using Assessment.Domain.Tests;
using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Questions.Queries;

/// <summary>
/// Возвращает список вопросов теста.
/// Доступно только владельцу.
/// </summary>
public sealed record ListQuestions(Guid TestId) : IRequest<List<QuestionDto>>;

public sealed class ListQuestionsHandler(
    IUserContext userContext,
    ITestRepository tests,
    IQuestionRepository questions)
    : IRequestHandler<ListQuestions, List<QuestionDto>>
{
    public async Task<List<QuestionDto>> Handle(ListQuestions request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        var isOwner = test.OwnerUserId == userId;

        if (!isOwner && test.Status != TestStatus.Published)
            throw new ForbiddenException("Тест недоступен.");

        var list = await questions.ListByTestIdAsync(test.Id, ct);
        var result = list.Adapt<List<QuestionDto>>();

        return isOwner ? result : result.HideCorrectAnswers();
    }
}