using BuildingBlocks.Api.Exceptions;
using Identity.Application.Interfaces;
using MediatR;

namespace Identity.Application.CQRS.Groups.Commands;

public sealed record DeleteGroup(Guid GroupId) : IRequest;

public sealed class DeleteGroupHandler(IGroupRepository groups)
    : IRequestHandler<DeleteGroup>
{
    public async Task Handle(DeleteGroup request, CancellationToken ct)
    {
        var group = await groups.GetById(request.GroupId, ct)
                    ?? throw new EntityNotFoundException("Группа не найдена.");

        await groups.RemoveAsync(group, ct);
    }
}
