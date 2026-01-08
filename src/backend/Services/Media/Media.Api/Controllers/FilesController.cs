using Media.Application.Interfaces;
using Media.Application.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Media.Api.Controllers;

/// <summary>
/// Управление файлами.
/// </summary>
[ApiController]
[Route("api/files")]
[Authorize]
public sealed class FilesController(IFileService fileService) : ControllerBase
{
    /// <summary>
    /// Загрузить файл (все авторизованные пользователи).
    /// </summary>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<IActionResult> Upload(
        [FromForm] FileUploadForm form,
        [FromQuery] string category = "general",
        [FromQuery] Guid? entityId = null,
        CancellationToken ct = default)
    {
        await using var stream = form.File.OpenReadStream();

        var result = await fileService.UploadAsync(
            stream,
            form.File.FileName,
            form.File.ContentType,
            form.File.Length,
            category,
            entityId,
            ct);

        return Ok(result);
    }

    /// <summary>
    /// Получить метаданные файла (все авторизованные).
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var file = await fileService.GetAsync(id, ct);
        return file is null ? NotFound() : Ok(file);
    }

    /// <summary>
    /// Скачать файл (публичный доступ).
    /// </summary>
    [HttpGet("{id:guid}/download")]
    [AllowAnonymous]
    public async Task<IActionResult> Download(Guid id, CancellationToken ct)
    {
        var file = await fileService.GetAsync(id, ct);
        if (file is null) return NotFound();

        var stream = await fileService.DownloadAsync(id, ct);
        return File(stream, file.ContentType, file.FileName);
    }

    /// <summary>
    /// Получить свои файлы (все авторизованные).
    /// </summary>
    [HttpGet("my")]
    public async Task<IActionResult> GetMy(CancellationToken ct) =>
        Ok(await fileService.GetMyFilesAsync(ct));

    /// <summary>
    /// Удалить файл (владелец файла или админ).
    /// </summary>
    [HttpDelete("{id:guid}")]
    // Проверка владельца в FileService
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await fileService.DeleteAsync(id, ct);
        return NoContent();
    }
}