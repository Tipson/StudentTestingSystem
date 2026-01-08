using Identity.Application.Groups.Queries;
using Identity.Application.Users.Commands;
using Identity.Application.Users.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Identity.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public sealed class MeController(IMediator mediator) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct) =>
        Ok(await mediator.Send(new GetMe(), ct));
    
    /// <summary>
    /// Получить список активных групп (для выбора студентом)
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetActiveGroups(
        [FromQuery] string? institution = null,
        [FromQuery] string? specialization = null,
        [FromQuery] int? course = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = new GetActiveGroups(institution, specialization, course, page, pageSize);
        var result = await mediator.Send(query);
        return Ok(result);
    }
    
    /// <summary>
    /// Студент выбирает свою группу
    /// </summary>
    [HttpPut("me/group")]
    public async Task<IActionResult> SelectMyGroup(Guid groupId)
    {
        var command = new SelectGroup(groupId);
        await mediator.Send(command);
        return NoContent();
    }

    /// <summary>
    /// Студент удаляет свою группу
    /// </summary>
    [HttpDelete("me/group")]
    public async Task<IActionResult> RemoveMyGroup()
    {
        var command = new RemoveGroup();
        await mediator.Send(command);
        return NoContent();
    }
}
