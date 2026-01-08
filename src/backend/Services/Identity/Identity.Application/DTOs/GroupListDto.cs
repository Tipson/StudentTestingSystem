using Identity.Application.Groups.Queries;

namespace Identity.Application.DTOs;

public sealed record GroupListDto
{
    public List<GroupDto> Items { get; init; } = new();
    public int Total { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
}