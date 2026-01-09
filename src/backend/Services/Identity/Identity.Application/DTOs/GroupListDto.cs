namespace Identity.Application.DTOs;

public sealed record GroupListDto
{
    public List<GroupDto> Items { get; init; } = new();
}