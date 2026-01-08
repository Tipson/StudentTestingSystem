using Assessment.Application.CQRS.Tests.Commands;
using Assessment.Application.CQRS.Tests.Queries;
using Assessment.Application.DTOs.Test;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Assessment.Api.Controllers;

[ApiController]
[Route("api/tests")]
[Authorize]
public sealed class TestsController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Создать тест (преподаватель/админ).
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Create([FromBody] CreateTestDto dto, CancellationToken ct) =>
        Ok(await mediator.Send(new CreateTest(dto), ct));

    /// <summary>
    /// Получить тест по ID (все авторизованные).
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        Ok(await mediator.Send(new GetTest(id), ct));

    /// <summary>
    /// Получить все тесты (все авторизованные).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await mediator.Send(new GetTests(), ct));
    
    /// <summary>
    /// Получить свои тесты (преподаватель).
    /// </summary>
    [HttpGet("my")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> GetMy(CancellationToken ct) =>
        Ok(await mediator.Send(new GetMyTests(), ct));

    /// <summary>
    /// Обновить тест (владелец или админ).
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTestDto dto, CancellationToken ct)
    {
        await mediator.Send(new UpdateTest(id, dto), ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/settings")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> UpdateSettings(Guid id, [FromBody] UpdateTestSettingsDto dto, CancellationToken ct) =>
        Ok(await mediator.Send(new UpdateTestSettings(id, dto), ct));

    [HttpPut("{id:guid}/publish")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Publish(Guid id, CancellationToken ct)
    {
        await mediator.Send(new PublishTest(id), ct);
        return NoContent();
    }
    
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await mediator.Send(new DeleteTest(id), ct);
        return NoContent();
    }
}