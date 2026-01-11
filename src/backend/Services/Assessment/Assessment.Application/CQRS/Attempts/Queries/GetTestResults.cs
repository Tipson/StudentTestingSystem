using System.Linq;
using Application;
using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using Assessment.Domain.Attempts;
using BuildingBlocks.Api.Exceptions;
using Contracts.Assessment.Enums;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Attempts.Queries;

/// <summary>
/// Возвращает список студентов с итоговыми баллами по тесту.
/// </summary>
public sealed record GetTestResults(Guid TestId, bool OnlyBestAttempts = true) : IRequest<List<StudentTestResultDto>>;

public sealed class GetTestResultsHandler(
    IUserContext userContext,
    ITestRepository tests,
    IAttemptRepository attempts)
    : IRequestHandler<GetTestResults, List<StudentTestResultDto>>
{
    public async Task<List<StudentTestResultDto>> Handle(GetTestResults request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не авторизован.");

        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден");

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Нет доступа к результатам этого теста");

        var attemptsList = await attempts.ListByTestAsync(request.TestId, ct);

        var submittedAttempts = attemptsList
            .Where(a => a.Status == AttemptStatus.Submitted)
            .ToList();

        IEnumerable<Attempt> filteredAttempts = submittedAttempts;

        if (request.OnlyBestAttempts)
        {
            filteredAttempts = submittedAttempts
                .GroupBy(a => a.UserId)
                .Select(group => group
                    .OrderByDescending(a => a.Score ?? 0)
                    .ThenByDescending(a => a.SubmittedAt ?? a.StartedAt)
                    .First())
                .ToList();
        }

        return filteredAttempts.Adapt<List<StudentTestResultDto>>();
    }
}
