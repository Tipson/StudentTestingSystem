using Identity.Application.DTOs;
using Identity.Application.Interfaces;
using Mapster;
using MediatR;

namespace Identity.Application.CQRS.Groups.Queries;

public sealed record GetActiveGroups(
    string? Institution,
    string? Specialization,
    int? Course) : IRequest<GroupListDto>;

public sealed class GetActiveGroupsHandler(IGroupRepository groups)
    : IRequestHandler<GetActiveGroups, GroupListDto>
{
    public async Task<GroupListDto> Handle(GetActiveGroups request, CancellationToken ct)
    {
        var items = await groups.GetActiveAsync(
            request.Institution,
            request.Specialization,
            request.Course,
            ct);

        return items.Adapt<GroupListDto>();
    }
}
