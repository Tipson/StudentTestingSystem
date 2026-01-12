using Assessment.Application.CQRS.Questions.Commands;
using Assessment.Application.CQRS.Questions.Queries;
using Assessment.Application.DTOs.Question;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Assessment.Api.Controllers;

/// <summary>
/// Управление вопросами теста (только для преподавателей и администраторов).
/// </summary>
[ApiController]
[Route("api")]
[Authorize(Roles = "teacher,admin")]
public sealed class QuestionsController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Создать вопрос в тесте.
    /// </summary>
    [HttpPost("tests/{testId:guid}/questions")]
    public async Task<IActionResult> Create(Guid testId, [FromBody] CreateQuestionDto dto, CancellationToken ct) =>
        Ok(await mediator.Send(new CreateQuestion(testId, dto), ct));

    /// <summary>
    /// Получить вопрос по ID.
    /// </summary>
    [HttpGet("questions/{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        Ok(await mediator.Send(new GetQuestion(id), ct));
    
    /// <summary>
    /// Получить все вопросы теста.
    /// </summary>
    [HttpGet("tests/{testId:guid}/questions")]
    public async Task<IActionResult> List(Guid testId, CancellationToken ct) =>
        Ok(await mediator.Send(new ListQuestions(testId), ct));

    /// <summary>
    /// Обновить вопрос.
    /// </summary>
    [HttpPut("questions/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateQuestionDto dto, CancellationToken ct) =>
        Ok(await mediator.Send(new UpdateQuestion(id, dto), ct));

    /// <summary>
    /// Удалить вопрос.
    /// </summary>
    [HttpDelete("questions/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await mediator.Send(new DeleteQuestion(id), ct);
        return NoContent();
    }
    
    /// <summary>
    /// Изменить порядок вопросов в тесте.
    /// </summary>
    [HttpPut("tests/{testId:guid}/questions/reorder")]
    public async Task<IActionResult> Reorder(Guid testId, [FromBody] List<Guid> questionIds, CancellationToken ct)
    {
        await mediator.Send(new ReorderQuestions(testId, questionIds), ct);
        return NoContent();
    }
}