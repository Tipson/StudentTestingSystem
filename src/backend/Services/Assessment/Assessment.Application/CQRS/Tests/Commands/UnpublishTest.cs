using Application;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using Contracts.Assessment.Enums;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Commands;

public sealed record UnpublishTest(Guid TestId) : IRequest;

public sealed class UnpublishTestHander(ITestRepository testRepository, IUserContext userContext) : IRequestHandler<UnpublishTest>
{
    public async Task Handle(UnpublishTest request, CancellationToken cancellationToken)
    {
        var test = await testRepository.GetByIdAsync(request.TestId, cancellationToken)
                   ?? throw new EntityNotFoundException($"Тест {request.TestId} не найден");
        
        if (test.OwnerUserId != userContext.UserId)
            throw new ForbiddenException("Недостаточно прав");
        
        if (test.Status != TestStatus.Published)
            throw new EntityNotFoundException("Тест не опубликован");

        test.Unpublish();

        await testRepository.UpdateAsync(test, cancellationToken);
    }
}