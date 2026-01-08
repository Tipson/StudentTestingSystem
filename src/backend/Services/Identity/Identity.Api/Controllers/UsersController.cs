using Contracts.Identity;
using Identity.Application.Users.Commands;
using Identity.Application.Users.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Identity.Api.Controllers;

/// <summary>
/// Управление пользователями.
/// </summary>
[ApiController]
[Route("api/users")]
[Authorize]
public sealed class UsersController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Получить информацию о текущем пользователе.
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken ct) =>
        Ok(await mediator.Send(new GetMe(), ct));

    /// <summary>
    /// Получить пользователя по ID (только админ).
    /// </summary>
    [HttpGet("{id}")]
    [Authorize(Roles = "Admin")] // ⭐ ДОБАВИТЬ
    public async Task<IActionResult> Get(string id, CancellationToken ct) =>
        Ok(await mediator.Send(new GetUser(id), ct));

    /// <summary>
    /// Получить всех пользователей (только админ).
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await mediator.Send(new GetUsers(), ct));

    /// <summary>
    /// Установить роль пользователя (только админ).
    /// </summary>
    [HttpPut("{id}/role")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetRole(string id, [FromBody] UserRole role, CancellationToken ct)
    {
        await mediator.Send(new SetUserRole(id, role), ct);
        return NoContent();
    }

    /// <summary>
    /// Активировать пользователя (только админ).
    /// </summary>
    [HttpPut("{id}/activate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Activate(string id, CancellationToken ct)
    {
        await mediator.Send(new ActivateUser(id), ct);
        return NoContent();
    }

    /// <summary>
    /// Деактивировать пользователя (только админ).
    /// </summary>
    [HttpPut("{id}/deactivate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Deactivate(string id, CancellationToken ct)
    {
        await mediator.Send(new DeactivateUser(id), ct);
        return NoContent();
    }
}