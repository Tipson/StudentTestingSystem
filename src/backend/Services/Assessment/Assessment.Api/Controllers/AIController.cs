using Assessment.Application.CQRS.AI;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Assessment.Api.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize]
public sealed class AIController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Получить AI-подсказку для вопроса (студент).
    /// </summary>
    [HttpPost("attempts/{attemptId:guid}/questions/{questionId:guid}/hint")]
    [Authorize(Roles = "student,admin,teacher")]
    public async Task<IActionResult> GetHint(Guid attemptId,
        Guid questionId,
        CancellationToken ct,
        [FromQuery] int level = 1) =>
        Ok(await mediator.Send(new RequestAIHint(attemptId, questionId, level), ct));
}