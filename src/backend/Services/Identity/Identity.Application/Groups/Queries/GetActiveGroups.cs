using Identity.Application.DTOs;
using Identity.Domain;
using MediatR;

namespace Identity.Application.Groups.Queries;

public sealed record GetActiveGroups(
    string? Institution,
    string? Specialization,
    int? Course,
    int Page,
    int PageSize) : IRequest<GroupListDto>;

public sealed class GetActiveGroupsHandler(IGroupRepository groups)
    : IRequestHandler<GetActiveGroups, GroupListDto>
{
    public async Task<GroupListDto> Handle(GetActiveGroups request, CancellationToken ct)
    {
        var (items, total) = await groups.GetActiveAsync(
            request.Institution,
            request.Specialization,
            request.Course,
            request.Page,
            request.PageSize,
            ct);

        var dtos = items.Select(g => new GroupDto
        {
            Id = g.Id,
            Code = g.Code,
            Institution = g.Institution,
            Specialization = g.Specialization,
            Course = g.Course,
            GroupNumber = g.GroupNumber,
            EnrollmentYear = g.EnrollmentYear
        }).ToList();

        return new GroupListDto
        {
            Items = dtos,
            Total = total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
