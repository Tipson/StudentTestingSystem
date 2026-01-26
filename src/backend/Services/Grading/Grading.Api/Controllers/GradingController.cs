using Contracts.Grading.Messages;
using Grading.Application.CQRS.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grading.Api.Controllers;

[ApiController]
[Route("api/grading")]
[Authorize]
public sealed class GradingController(
    IMediator mediator,
    ILogger<GradingController> logger)
    : ControllerBase
{
    /// <summary>
    /// Проверить все ответы попытки.
    /// </summary>
    [HttpPost("grade-attempt")]
    public async Task<ActionResult<GradeAttemptResponse>> GradeAttempt(
        [FromBody] GradeAttemptRequest request,
        CancellationToken ct)
    {
        logger.LogInformation("Получен запрос на проверку попытки {AttemptId}", request.AttemptId);

        var response = await mediator.Send(new GradeAttempt(request), ct);

        return Ok(response);
    }

    /// <summary>
    /// Вручную проверить один ответ.
    /// </summary>
    [HttpPost("manual-grade")]
    public async Task<ActionResult<ManualGradeResponse>> ManualGrade(
        [FromBody] ManualGradeRequest request,
        CancellationToken ct)
    {
        logger.LogInformation(
            "Получен запрос на ручную проверку вопроса {QuestionId} в попытке {AttemptId}",
            request.QuestionId, request.AttemptId);

        var response = await mediator.Send(new GradeAnswerManually(request), ct);

        return Ok(response);
    }
}