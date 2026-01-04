using Assessment.Application.CQRS.Tests.Commands;
using Assessment.Application.CQRS.Tests.Queries;
using Assessment.Application.DTOs.Test;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Assessment.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public sealed class TestsController(IMediator mediator) : ControllerBase
{
    [HttpPost("tests")]
    public async Task<IActionResult> Create([FromBody] CreateTestDto dto, CancellationToken ct) =>
        Ok(await mediator.Send(new CreateTest(dto), ct));

    [HttpGet("tests/{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        Ok(await mediator.Send(new GetTest(id), ct));

    [HttpGet("tests")]
    public async Task<IActionResult> List(CancellationToken ct) =>
        Ok(await mediator.Send(new GetMyTests(), ct));

    [HttpPut("tests/{id:guid}/settings")]
    public async Task<IActionResult> UpdateSettings(Guid id, [FromBody] UpdateTestSettingsDto dto, CancellationToken ct) =>
        Ok(await mediator.Send(new UpdateTestSettings(id, dto), ct));

    [HttpPut("tests/{id:guid}/publish")]
    public async Task<IActionResult> Publish(Guid id, CancellationToken ct)
    {
        await mediator.Send(new PublishTest(id), ct);
        return NoContent();
    }
    
    [HttpDelete("tests/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await mediator.Send(new DeleteTest(id), ct);
        return NoContent();
    }
}