using BuildingBlocks.Api.Exceptions;
using Identity.Application.Interfaces;
using MediatR;

namespace Identity.Application.CQRS.Groups.Commands;

public sealed record UpdateGroup(
    Guid GroupId,
    string Institution,
    string Specialization,
    int Course,
    int GroupNumber
) : IRequest;

public sealed class UpdateGroupHandler(IGroupRepository groups)
    : IRequestHandler<UpdateGroup>
{
    public async Task Handle(UpdateGroup request, CancellationToken ct)
    {
        var group = await groups.GetById(request.GroupId, ct)
                    ?? throw new EntityNotFoundException("Группа не найдена.");

        group.Update(request.Institution, request.Specialization, request.Course, request.GroupNumber);

        await groups.UpdateAsync(group, ct);
    }
}
