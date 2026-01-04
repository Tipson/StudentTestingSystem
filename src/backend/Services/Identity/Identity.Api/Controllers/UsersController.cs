using Contracts.Identity;
using Identity.Application.Users.Commands;
using Identity.Application.Users.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Identity.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public sealed class UsersController(IMediator mediator) : ControllerBase
{
    [HttpGet("users/{id}")]
    public async Task<IActionResult> Get(string id, CancellationToken ct) =>
        Ok(await mediator.Send(new GetUser(id), ct));

    [HttpGet("users")]
    public async Task<IActionResult> List(CancellationToken ct) =>
        Ok(await mediator.Send(new GetUsers(), ct));

    [HttpPut("users/{id}/role")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> SetRole(string id, [FromBody] UserRole role, CancellationToken ct)
    {
        await mediator.Send(new SetUserRole(id, role), ct);
        return NoContent();
    }

    [HttpPut("users/{id}/activate")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Activate(string id, CancellationToken ct)
    {
        await mediator.Send(new ActivateUser(id), ct);
        return NoContent();
    }

    [HttpPut("users/{id}/deactivate")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Deactivate(string id, CancellationToken ct)
    {
        await mediator.Send(new DeactivateUser(id), ct);
        return NoContent();
    }
}
