using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Http;
using Contracts.Grading.Messages;
using Microsoft.Extensions.Logging;

namespace Assessment.Infrastructure.Grading.Clients;

/// <summary>
/// HTTP клиент для взаимодействия с Grading Service. Токен подкладывает BearerTokenDelegatingHandler.
/// </summary>
public sealed class HttpGradingClient(HttpClient httpClient, ILogger<HttpGradingClient> logger)
    : BaseInternalHttpClient(httpClient, logger), IGradingClient
{
    public async Task<GradeAttemptResponse> GradeAttemptAsync(GradeAttemptRequest request, CancellationToken ct = default)
    {
        Logger.LogInformation("Отправка запроса на проверку попытки {AttemptId} в Grading Service", request.AttemptId);
        var result = await PostAsync<GradeAttemptRequest, GradeAttemptResponse>("/api/grading/grade-attempt", request, ct);
        Logger.LogInformation("Попытка {AttemptId} успешно проверена: {EarnedPoints}/{TotalPoints}",
            result.AttemptId, result.EarnedPoints, result.TotalPoints);
        return result;
    }

    public async Task<ManualGradeResponse> GradeAnswerManuallyAsync(ManualGradeRequest request, CancellationToken ct = default)
    {
        Logger.LogInformation("Отправка запроса на ручную проверку вопроса {QuestionId} в попытке {AttemptId} в Grading Service",
            request.QuestionId, request.AttemptId);
        var result = await PostAsync<ManualGradeRequest, ManualGradeResponse>("/api/grading/manual-grade", request, ct);
        Logger.LogInformation("Вопрос {QuestionId} успешно проверен вручную: {Points} баллов. Общий балл попытки: {EarnedPoints}/{TotalPoints}",
            result.QuestionId, result.PointsAwarded, result.TotalEarnedPoints, result.TotalMaxPoints);
        return result;
    }
}
