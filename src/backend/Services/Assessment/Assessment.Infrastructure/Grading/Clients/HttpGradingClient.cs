using System.Text;
using System.Text.Json;
using Assessment.Application.Interfaces;
using Assessment.Infrastructure.Grading.Options;
using Contracts.Grading.Messages;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Assessment.Infrastructure.Grading.Clients;

/// <summary>
/// HTTP клиент для взаимодействия с Grading Service.
/// </summary>
public sealed class HttpGradingClient : IGradingClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<HttpGradingClient> _logger;
    private readonly GradingServiceOptions _options;
    private readonly JsonSerializerOptions _jsonOptions;

    public HttpGradingClient(
        HttpClient httpClient,
        IOptions<GradingServiceOptions> options,
        ILogger<HttpGradingClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _options = options.Value;
        
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
    }

    public async Task<GradeAttemptResponse> GradeAttemptAsync(
        GradeAttemptRequest request,
        CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Отправка запроса на проверку попытки {AttemptId} в Grading Service",
            request.AttemptId);

        try
        {
            var json = JsonSerializer.Serialize(request, _jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("/api/grading/grade-attempt", content, ct);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(ct);
            var result = JsonSerializer.Deserialize<GradeAttemptResponse>(responseJson, _jsonOptions);

            if (result is null)
                throw new InvalidOperationException("Не удалось десериализовать ответ от Grading Service");

            _logger.LogInformation(
                "Попытка {AttemptId} успешно проверена: {EarnedPoints}/{TotalPoints}",
                result.AttemptId, result.EarnedPoints, result.TotalPoints);

            return result;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex,
                "Ошибка HTTP при обращении к Grading Service для попытки {AttemptId}",
                request.AttemptId);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Неожиданная ошибка при проверке попытки {AttemptId} через Grading Service",
                request.AttemptId);
            throw;
        }
    }

    public async Task<ManualGradeResponse> GradeAnswerManuallyAsync(
        ManualGradeRequest request,
        CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Отправка запроса на ручную проверку вопроса {QuestionId} в попытке {AttemptId} в Grading Service",
            request.QuestionId, request.AttemptId);

        try
        {
            var json = JsonSerializer.Serialize(request, _jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("/api/grading/manual-grade", content, ct);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(ct);
            var result = JsonSerializer.Deserialize<ManualGradeResponse>(responseJson, _jsonOptions);

            if (result is null)
                throw new InvalidOperationException("Не удалось десериализовать ответ от Grading Service");

            _logger.LogInformation(
                "Вопрос {QuestionId} успешно проверен вручную: {Points} баллов. Общий балл попытки: {EarnedPoints}/{TotalPoints}",
                result.QuestionId, result.PointsAwarded, result.TotalEarnedPoints, result.TotalMaxPoints);

            return result;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex,
                "Ошибка HTTP при ручной проверке вопроса {QuestionId} в Grading Service",
                request.QuestionId);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Неожиданная ошибка при ручной проверке вопроса {QuestionId} через Grading Service",
                request.QuestionId);
            throw;
        }
    }
}