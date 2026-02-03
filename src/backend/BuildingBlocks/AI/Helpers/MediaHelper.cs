using System.Net.Http.Json;
using BuildingBlocks.Integrations.Gemini.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.AI.Helpers;

public sealed class MediaHelper : IMediaHelper
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<MediaHelper> _logger;

    public MediaHelper(
        IHttpClientFactory httpClientFactory,
        IHttpContextAccessor httpContextAccessor,
        ILogger<MediaHelper> logger)
    {
        _httpClientFactory = httpClientFactory;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task<MediaContent?> GetMediaContentAsync(Guid mediaId, CancellationToken ct = default)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("MediaApiClient");

            var token = _httpContextAccessor.HttpContext?.Request.Headers.Authorization.ToString();
            if (!string.IsNullOrEmpty(token))
            {
                client.DefaultRequestHeaders.Add("Authorization", token);
            }

            // Получаем метаданные
            var metadataResponse = await client.PostAsJsonAsync(
                "/api/files/get",
                new { ids = new[] { mediaId } },
                ct);

            metadataResponse.EnsureSuccessStatusCode();

            var files = await metadataResponse.Content.ReadFromJsonAsync<List<MediaFileDto>>(ct);
            var mediaFile = files?.FirstOrDefault();

            if (mediaFile == null)
            {
                _logger.LogWarning("Файл {MediaId} не найден", mediaId);
                return null;
            }

            // Скачиваем файл
            var downloadResponse = await client.PostAsJsonAsync(
                "/api/files/download",
                new { ids = new[] { mediaId } },
                ct);

            downloadResponse.EnsureSuccessStatusCode();

            var fileBytes = await downloadResponse.Content.ReadAsByteArrayAsync(ct);
            var base64 = Convert.ToBase64String(fileBytes);

            _logger.LogDebug(
                "Загружен файл {MediaId}: {Size} bytes",
                mediaId, fileBytes.Length);

            return new MediaContent(base64, mediaFile.ContentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка загрузки MediaFile {MediaId}", mediaId);
            return null;
        }
    }

    public async Task<List<MediaContent>> GetMediaContentsAsync(
        IEnumerable<Guid> mediaIds,
        CancellationToken ct = default)
    {
        var tasks = mediaIds.Select(id => GetMediaContentAsync(id, ct));
        var results = await Task.WhenAll(tasks);

        return results
            .Where(r => r != null)
            .Select(r => r!)
            .ToList();
    }
}

internal sealed record MediaFileDto(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeBytes
);