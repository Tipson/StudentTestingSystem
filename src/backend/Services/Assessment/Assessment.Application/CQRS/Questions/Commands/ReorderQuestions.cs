using Assessment.Application.Interfaces;
using Assessment.Domain.Tests;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Identity;
using MediatR;

namespace Assessment.Application.CQRS.Questions.Commands;

public sealed record ReorderQuestions(Guid TestId, List<Guid> QuestionIds) : IRequest;

public sealed class ReorderQuestionsHandler(
    IQuestionRepository questionRepository,
    ITestRepository testRepository,
    IUserContext userContext)
    : IRequestHandler<ReorderQuestions>
{
    public async Task Handle(ReorderQuestions request, CancellationToken ct)
    {
        var test = await testRepository.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException($"Тест {request.TestId} не найден");

        if (test.OwnerUserId != userContext.UserId)
            throw new ForbiddenException("Недостаточно прав");

        if (test.Status == TestStatus.Published)
            throw new BadRequestApiException("Нельзя изменять порядок вопросов опубликованного теста");

        var questions = await questionRepository.ListByTestIdAsync(request.TestId, ct);

        // Проверяем что все ID валидны
        var questionIds = questions.Select(q => q.Id).ToHashSet();
        if (!request.QuestionIds.All(id => questionIds.Contains(id)))
            throw new InvalidOperationException("Некорректный список вопросов");

        // Обновляем порядок
        for (var i = 0; i < request.QuestionIds.Count; i++)
        {
            var question = questions.First(q => q.Id == request.QuestionIds[i]);
            question.SetOrder(i + 1);
        }

        await questionRepository.UpdateRangeAsync(questions, ct);
    }
}