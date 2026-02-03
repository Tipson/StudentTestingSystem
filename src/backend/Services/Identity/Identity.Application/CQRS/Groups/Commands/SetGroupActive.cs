using BuildingBlocks.Api.Exceptions;
using Identity.Application.Interfaces;
using MediatR;

namespace Identity.Application.CQRS.Groups.Commands;

public sealed record SetGroupActive(Guid GroupId, bool IsActive) : IRequest;

public sealed class SetGroupActiveHandler(IGroupRepository groups)
    : IRequestHandler<SetGroupActive>
{
    public async Task Handle(SetGroupActive request, CancellationToken ct)
    {
        var group = await groups.GetById(request.GroupId, ct)
                    ?? throw new EntityNotFoundException("Группа не найдена.");

        if (request.IsActive) group.Activate();
        else group.Deactivate();

        await groups.UpdateAsync(group, ct);
    }
}
