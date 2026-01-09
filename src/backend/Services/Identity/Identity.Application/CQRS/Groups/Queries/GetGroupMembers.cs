using Identity.Application.DTOs;
using Identity.Application.Interfaces;
using Mapster;
using MediatR;

namespace Identity.Application.CQRS.Groups.Queries;

public sealed record GetGroupMembers(Guid GroupId) : IRequest<List<GroupMemberDto>>;

public sealed class GetGroupMembersHandler(
    IGroupRepository groups
) : IRequestHandler<GetGroupMembers, List<GroupMemberDto>>
{
    public async Task<List<GroupMemberDto>> Handle(GetGroupMembers request, CancellationToken ct)
    {
        var users = await groups.GetMembersAsync(request.GroupId, ct);

        return users.Adapt<List<GroupMemberDto>>();
    }
}