using System.Text;
using System.Text.Json;
using Assessment.Application.Interfaces;
using Assessment.Infrastructure.Grading.Options;
using Contracts.Grading.Messages;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Assessment.Infrastructure.Grading.Clients;

/// <summary>
/// HTTP клиент для взаимодействия с Grading Service. Передаёт JWT текущего запроса в заголовке Authorization.
/// </summary>
public sealed class HttpGradingClient : IGradingClient
{
    private readonly HttpClient _httpClient;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<HttpGradingClient> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public HttpGradingClient(
        HttpClient httpClient,
        IHttpContextAccessor httpContextAccessor,
        IOptions<GradingServiceOptions> _,
        ILogger<HttpGradingClient> logger)
    {
        _httpClient = httpClient;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string path, HttpContent? content)
    {
        var request = new HttpRequestMessage(method, path) { Content = content };
        var auth = _httpContextAccessor.HttpContext?.Request.Headers.Authorization;
        if (!string.IsNullOrEmpty(auth))
            request.Headers.TryAddWithoutValidation("Authorization", auth.ToString());
        return request;
    }

    private async Task<TResponse> PostAsync<TRequest, TResponse>(string path, TRequest body, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(body, JsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var message = CreateRequest(HttpMethod.Post, path, content);
        var response = await _httpClient.SendAsync(message, ct);
        response.EnsureSuccessStatusCode();
        var responseJson = await response.Content.ReadAsStringAsync(ct);
        return JsonSerializer.Deserialize<TResponse>(responseJson, JsonOptions)
            ?? throw new InvalidOperationException("Не удалось десериализовать ответ от Grading Service");
    }

    public async Task<GradeAttemptResponse> GradeAttemptAsync(GradeAttemptRequest request, CancellationToken ct = default)
    {
        _logger.LogInformation("Отправка запроса на проверку попытки {AttemptId} в Grading Service", request.AttemptId);
        try
        {
            var result = await PostAsync<GradeAttemptRequest, GradeAttemptResponse>("/api/grading/grade-attempt", request, ct);
            _logger.LogInformation("Попытка {AttemptId} успешно проверена: {EarnedPoints}/{TotalPoints}",
                result.AttemptId, result.EarnedPoints, result.TotalPoints);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка при обращении к Grading Service для попытки {AttemptId}", request.AttemptId);
            throw;
        }
    }

    public async Task<ManualGradeResponse> GradeAnswerManuallyAsync(ManualGradeRequest request, CancellationToken ct = default)
    {
        _logger.LogInformation("Отправка запроса на ручную проверку вопроса {QuestionId} в попытке {AttemptId} в Grading Service",
            request.QuestionId, request.AttemptId);
        try
        {
            var result = await PostAsync<ManualGradeRequest, ManualGradeResponse>("/api/grading/manual-grade", request, ct);
            _logger.LogInformation("Вопрос {QuestionId} успешно проверен вручную: {Points} баллов. Общий балл попытки: {EarnedPoints}/{TotalPoints}",
                result.QuestionId, result.PointsAwarded, result.TotalEarnedPoints, result.TotalMaxPoints);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка при ручной проверке вопроса {QuestionId} в Grading Service", request.QuestionId);
            throw;
        }
    }
}
