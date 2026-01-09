using Identity.Application.CQRS.Users.Commands;
using Identity.Application.CQRS.Users.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Identity.Api.Controllers;

[ApiController]
[Route("api/me")]
[Authorize]
public sealed class MeController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Получить информацию о текущем пользователе.
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken ct) =>
        Ok(await mediator.Send(new GetMe(), ct));
    
    /// <summary>
    /// Студент выбирает свою группу
    /// </summary>
    [HttpPut("group")]
    public async Task<IActionResult> SelectMyGroup([FromBody] Guid groupId, CancellationToken ct)
    {
        await mediator.Send(new SelectGroup(groupId), ct);
        return NoContent();
    }

    /// <summary>
    /// Студент удаляет свою группу
    /// </summary>
    [HttpDelete("group")]
    public async Task<IActionResult> RemoveMyGroup(CancellationToken ct)
    {
        await mediator.Send(new RemoveGroup(), ct);
        return NoContent();
    }
}