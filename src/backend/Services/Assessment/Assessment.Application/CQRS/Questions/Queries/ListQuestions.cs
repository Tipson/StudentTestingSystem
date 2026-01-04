using Assessment.Application.DTOs.Question;
using Assessment.Application.Interfaces;
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

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Нет доступа.");

        var list = await questions.ListByTestIdAsync(test.Id, ct);
        return list.Adapt<List<QuestionDto>>();
    }
}