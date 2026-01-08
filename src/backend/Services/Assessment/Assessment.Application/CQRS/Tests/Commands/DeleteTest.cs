using Application;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Commands;

public sealed record DeleteTest(Guid TestId) : IRequest;

public sealed class DeleteTestHandler(ITestRepository testRepository, IUserContext userContext) : IRequestHandler<DeleteTest>
{
    public async Task Handle(DeleteTest request, CancellationToken cancellationToken)
    {
        var test = await testRepository.GetByIdAsync(request.TestId, cancellationToken)
            ?? throw new EntityNotFoundException($"Тест {request.TestId} не найден");
        
        if (test.OwnerUserId != userContext.UserId)
            throw new ForbiddenException("Недостаточно прав для удаления теста");
        
        await testRepository.DeleteAsync(test, cancellationToken);
    }
}