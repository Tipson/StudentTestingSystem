using Contracts.Grading.Messages;
using Grading.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grading.Api.Controllers;

[ApiController]
[Route("api/grading")]
[Authorize]
public sealed class GradingController(
    IGradingOrchestrator orchestrator,
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

        var response = await orchestrator.GradeAttemptAsync(request, ct);

        return Ok(response);
    }
}