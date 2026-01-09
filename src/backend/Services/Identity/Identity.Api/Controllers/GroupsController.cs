using Identity.Application.CQRS.Groups.Commands;
using Identity.Application.CQRS.Groups.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Identity.Api.Controllers;

[ApiController]
[Route("api/groups")]
public sealed class GroupsAdminController(IMediator mediator) : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateGroup command, CancellationToken ct)
    {
        var id = await mediator.Send(command, ct);
        return Ok(id);
    }

    [HttpPut("{groupId:guid}")]
    [Authorize(Roles = "Admin")]

    public async Task<IActionResult> Update(Guid groupId, [FromBody] string institution, string specialization, int course, int groupNumber, CancellationToken ct)
    {
        await mediator.Send(new UpdateGroup(groupId, institution, specialization, course, groupNumber), ct);
        return NoContent();
    }

    [HttpDelete("{groupId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid groupId, CancellationToken ct)
    {
        await mediator.Send(new DeleteGroup(groupId), ct);
        return NoContent();
    }

    [HttpPut("{groupId:guid}/active")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetActive(Guid groupId, [FromBody] bool isActive, CancellationToken ct)
    {
        await mediator.Send(new SetGroupActive(groupId, isActive), ct);
        return NoContent();
    }
    
    /// <summary>
    /// Получить список активных групп (для выбора студентом)
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetActiveGroups(
        [FromQuery] string? institution = null,
        [FromQuery] string? specialization = null,
        [FromQuery] int? course = null,
        CancellationToken ct = default)
    {
        var query = new GetActiveGroups(institution, specialization, course);
        var result = await mediator.Send(query, ct);
        return Ok(result);
    }
}