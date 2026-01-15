using Assessment.Application.CQRS.Attempts.Commands;
using Assessment.Application.CQRS.Attempts.Queries;
using Assessment.Application.DTOs.Attempt;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Assessment.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public sealed class AttemptsController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Начать прохождение теста.
    /// </summary>
    [HttpPost("tests/{testId:guid}/attempts")]
    public async Task<IActionResult> Start(Guid testId, CancellationToken ct) =>
        Ok(await mediator.Send(new StartAttempt(testId), ct));

    /// <summary>
    /// Получить все попытки по тесту (для преподавателя).
    /// </summary>
    [HttpGet("tests/{testId:guid}/attempts")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> GetByTest(Guid testId, CancellationToken ct) =>
        Ok(await mediator.Send(new GetTestAttempts(testId), ct));

    /// <summary>
    /// Получить результаты теста
    /// </summary>
    [HttpGet("tests/{testId:guid}/results")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> GetResults(Guid testId, CancellationToken ct) =>
        Ok(await mediator.Send(new GetTestResults(testId), ct));

    /// <summary>
    /// Получить попытку по ID.
    /// </summary>
    [HttpGet("attempts/{id:guid}")]
    // Проверка прав доступа в handler
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        Ok(await mediator.Send(new GetAttempt(id), ct));

    /// <summary>
    /// Сохранить ответ на вопрос.
    /// </summary>
    [HttpPut("attempts/{attemptId:guid}/answers/{questionId:guid}")]
    public async Task<IActionResult> SaveAnswer(
        Guid attemptId, 
        Guid questionId, 
        [FromBody] SaveAnswerDto dto, 
        CancellationToken ct) =>
        Ok(await mediator.Send(new SaveAnswer(attemptId, questionId, dto), ct));

    /// <summary>
    /// Завершить попытку.
    /// </summary>
    [HttpPost("attempts/{id:guid}/submit")]
    public async Task<IActionResult> Submit(Guid id, CancellationToken ct) =>
        Ok(await mediator.Send(new SubmitAttempt(id), ct));

    /// <summary>
    /// Получить результат попытки.
    /// </summary>
    [HttpGet("attempts/{id:guid}/result")]
    // Проверка прав доступа в handler
    public async Task<IActionResult> GetResult(Guid id, CancellationToken ct) =>
        Ok(await mediator.Send(new GetAttemptResult(id), ct));

    /// <summary>
    /// Получить все свои попытки.
    /// </summary>
    [HttpGet("attempts/my")]
    public async Task<IActionResult> GetMy(CancellationToken ct) =>
        Ok(await mediator.Send(new GetMyAttempts(), ct));
    
    /// <summary>
    /// Получить список попыток, требующих ручной проверки (для преподавателей).
    /// </summary>
    [HttpGet("attempts/pending-review")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> GetPendingReview(CancellationToken ct) =>
        Ok(await mediator.Send(new GetPendingReview(), ct));
    
    /// <summary>
    /// Оценить ответ вручную (только для преподавателя).
    /// </summary>
    [HttpPut("attempts/{attemptId:guid}/answers/{questionId:guid}/grade")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> GradeAnswer(
        Guid attemptId,
        Guid questionId,
        [FromBody] GradeAnswerDto dto,
        CancellationToken ct) =>
        Ok(await mediator.Send(new GradeAnswer(attemptId, questionId, dto), ct));
}
