using Assessment.Application.CQRS.Tests.Commands;
using Assessment.Application.CQRS.Tests.Queries;
using Assessment.Application.DTOs.Test;
using Assessment.Domain.Tests.Enums;
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
    [Authorize(Roles = "teacher,admin")]
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
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> GetMy(CancellationToken ct) =>
        Ok(await mediator.Send(new GetMyTests(), ct));

    /// <summary>
    /// Обновить тест (владелец или админ).
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTestDto dto, CancellationToken ct)
    {
        await mediator.Send(new UpdateTest(id, dto), ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/settings")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> UpdateSettings(Guid id, [FromBody] UpdateTestSettingsDto dto, CancellationToken ct) =>
        Ok(await mediator.Send(new UpdateTestSettings(id, dto), ct));
    
    /// <summary>
    /// Установить тип доступа к тесту (Public/Private).
    /// </summary>
    [HttpPut("{id:guid}/access-type/{accessType}")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> SetAccessType(
        Guid id, 
        TestAccessType accessType, 
        CancellationToken ct)
    {
        await mediator.Send(new SetTestAccessType(id, accessType), ct);
        return NoContent();
    }
    
    /// <summary>
    /// Установить временные рамки доступности теста.
    /// </summary>
    [HttpPut("{id:guid}/availability")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> SetAvailability(
        Guid id, 
        [FromQuery] DateTimeOffset? availableFrom,
        [FromQuery] DateTimeOffset? availableUntil,
        CancellationToken ct)
    {
        await mediator.Send(new SetTestAvailability(id, availableFrom, availableUntil), ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/publish")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> Publish(Guid id, CancellationToken ct)
    {
        await mediator.Send(new PublishTest(id), ct);
        return NoContent();
    }
    
    [HttpPut("{id:guid}/unpublish")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> Unpublish(Guid id, CancellationToken ct)
    {
        await mediator.Send(new UnpublishTest(id), ct);
        return NoContent();
    }
    
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await mediator.Send(new DeleteTest(id), ct);
        return NoContent();
    }
    
    #region Access Management

    /// <summary>
    /// Выдать доступ к тесту конкретному пользователю.
    /// </summary>
    [HttpPost("{id:guid}/access/users")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> GrantAccessToUser(
        Guid id,
        [FromBody] GrantAccessToUserDto dto,
        CancellationToken ct)
    {
        var accessId = await mediator.Send(
            new GrantAccessToUser(id, dto.UserId, dto.ExpiresAt),
            ct);

        return Ok(new { accessId });
    }

    /// <summary>
    /// Выдать доступ к тесту группе.
    /// </summary>
    [HttpPost("{id:guid}/access/groups")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> GrantAccessToGroup(
        Guid id,
        [FromBody] GrantAccessToGroupDto dto,
        CancellationToken ct)
    {
        var accessId = await mediator.Send(
            new GrantAccessToGroup(id, dto.GroupId, dto.ExpiresAt),
            ct);

        return Ok(new { accessId });
    }

    /// <summary>
    /// Создать ссылку-приглашение для теста.
    /// </summary>
    [HttpPost("{id:guid}/access/invite-links")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> CreateInviteLink(
        Guid id,
        [FromBody] CreateInviteLinkDto dto,
        CancellationToken ct)
    {
        var result = await mediator.Send(
            new CreateInviteLink(id, dto.MaxUses, dto.ExpiresAt),
            ct);

        return Ok(result);
    }

    /// <summary>
    /// Получить список доступов к тесту.
    /// </summary>
    [HttpGet("{id:guid}/access")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> GetAccesses(Guid id, CancellationToken ct)
    {
        var accesses = await mediator.Send(new GetTestAccesses(id), ct);
        return Ok(accesses);
    }

    /// <summary>
    /// Отозвать доступ к тесту.
    /// </summary>
    [HttpDelete("access/{accessId:guid}")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> RevokeAccess(Guid accessId, CancellationToken ct)
    {
        await mediator.Send(new RevokeAccess(accessId), ct);
        return NoContent();
    }

    /// <summary>
    /// Присоединиться к тесту по ссылке-приглашению.
    /// </summary>
    [HttpPost("join/{inviteCode:guid}")]
    [AllowAnonymous] // Или [Authorize] если требуется авторизация
    public async Task<IActionResult> JoinByInvite(Guid inviteCode, CancellationToken ct)
    {
        var testId = await mediator.Send(new JoinTestByInvite(inviteCode), ct);
        return Ok(new { testId, message = "Доступ к тесту предоставлен" });
    }

    #endregion
}