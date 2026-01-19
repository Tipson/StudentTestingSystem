using Media.Application.DTOs;
using Media.Application.Helpers;
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
public sealed class FilesController(IFileService fileService) : ControllerBase
{
    /// <summary>
    /// Загрузить файл.
    /// </summary>
    /// <remarks>
    /// Лимиты размера:
    /// - Изображения: 50 MB
    /// - Видео: 500 MB
    /// - Документы: 50 MB
    /// </remarks>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(FileValidatorHelper.MaxVideoSizeBytes * 5)]
    [RequestFormLimits(MultipartBodyLengthLimit = FileValidatorHelper.MaxVideoSizeBytes)]
    [ProducesResponseType(typeof(MediaFileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Upload(
        [FromForm] FilesUploadForm form,
        [FromQuery] string category = "general",
        [FromQuery] Guid? entityId = null,
        CancellationToken ct = default)
    {
        var result = await fileService.UploadAsync(form.Files, category, entityId, ct);
        return Ok(result);
    }

    /// <summary>
    /// Получить метаданные файлов.
    /// </summary>
    /// <remarks>
    /// Принимает от 1 до 100 ID. Возвращает метаданные только для найденных файлов.
    /// </remarks>
    [HttpPost("get")]
    [ProducesResponseType(typeof(List<MediaFileDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Get(
        [FromBody] FileIdsRequest request,
        CancellationToken ct)
    {
        var files = await fileService.GetAsync(request.Ids, ct);
        return Ok(files);
    }

    /// <summary>
    /// Скачать файлы.
    /// </summary>
    /// <remarks>
    /// - Один файл: возвращает файл напрямую с оригинальным именем
    /// - Несколько файлов: возвращает ZIP-архив
    /// 
    /// Максимум 100 файлов за запрос.
    /// </remarks>
    [HttpPost("download")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Download(
        [FromBody] FileIdsRequest request,
        CancellationToken ct)
    {
        var result = await fileService.DownloadAsync(request.Ids, ct);
    
        if (result.IsRedirect)
            return Redirect(result.RedirectUrl!);
    
        return File(result.Stream!, result.ContentType!, result.FileName);
    }

    /// <summary>
    /// Получить свои файлы.
    /// </summary>
    [HttpGet("my")]
    [ProducesResponseType(typeof(List<MediaFileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMy(CancellationToken ct) =>
        Ok(await fileService.GetMyFilesAsync(ct));

    /// <summary>
    /// Удалить файлы.
    /// </summary>
    /// <remarks>
    /// Удаляет только файлы, принадлежащие текущему пользователю.
    /// Возвращает количество удалённых файлов и список ошибок для неудалённых.
    /// Максимум 100 файлов за запрос.
    /// </remarks>
    [HttpPost("delete")]
    [ProducesResponseType(typeof(DeleteResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Delete(
        [FromBody] FileIdsRequest request,
        CancellationToken ct)
    {
        var result = await fileService.DeleteAsync(request.Ids, ct);
        return Ok(result);
    }
}