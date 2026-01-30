using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Api.Http;

/// <summary>
/// Базовый класс для HTTP-клиентов внутренних сервисов. Токен подкладывает BearerTokenDelegatingHandler.
/// Общая логика POST/GET/PUT/PATCH/DELETE и обработка ошибок.
/// </summary>
public abstract class BaseInternalHttpClient
{
    private readonly HttpClient _httpClient;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    protected HttpClient Http => _httpClient;
    protected ILogger Logger { get; }

    protected BaseInternalHttpClient(HttpClient httpClient, ILogger logger)
    {
        _httpClient = httpClient;
        Logger = logger;
    }

    protected Task<TResponse> PostAsync<TRequest, TResponse>(string path, TRequest body, CancellationToken ct) =>
        SendJsonAsync<TRequest, TResponse>(HttpMethod.Post, path, body, ct);

    protected Task<TResponse> PutAsync<TRequest, TResponse>(string path, TRequest body, CancellationToken ct) =>
        SendJsonAsync<TRequest, TResponse>(HttpMethod.Put, path, body, ct);

    protected Task<TResponse> PatchAsync<TRequest, TResponse>(string path, TRequest body, CancellationToken ct) =>
        SendJsonAsync<TRequest, TResponse>(HttpMethod.Patch, path, body, ct);

    private async Task<TResponse> SendJsonAsync<TRequest, TResponse>(HttpMethod method, string path, TRequest body, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(body, JsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var message = new HttpRequestMessage(method, path) { Content = content };
        try
        {
            var response = await _httpClient.SendAsync(message, ct);
            response.EnsureSuccessStatusCode();
            var responseJson = await response.Content.ReadAsStringAsync(ct);
            return JsonSerializer.Deserialize<TResponse>(responseJson, JsonOptions)
                ?? throw new InvalidOperationException("Не удалось десериализовать ответ от сервиса");
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Ошибка HTTP при вызове {Path}", path);
            throw;
        }
    }

    protected async Task<TResponse?> GetAsync<TResponse>(string path, CancellationToken ct)
    {
        using var message = new HttpRequestMessage(HttpMethod.Get, path);
        try
        {
            var response = await _httpClient.SendAsync(message, ct);
            response.EnsureSuccessStatusCode();
            var responseJson = await response.Content.ReadAsStringAsync(ct);
            return JsonSerializer.Deserialize<TResponse>(responseJson, JsonOptions);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Ошибка HTTP при вызове {Path}", path);
            throw;
        }
    }

    protected async Task<TResponse?> DeleteAsync<TResponse>(string path, CancellationToken ct)
    {
        using var message = new HttpRequestMessage(HttpMethod.Delete, path);
        try
        {
            var response = await _httpClient.SendAsync(message, ct);
            response.EnsureSuccessStatusCode();
            var responseJson = await response.Content.ReadAsStringAsync(ct);
            return string.IsNullOrWhiteSpace(responseJson)
                ? default
                : JsonSerializer.Deserialize<TResponse>(responseJson, JsonOptions);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Ошибка HTTP при вызове {Path}", path);
            throw;
        }
    }
}
