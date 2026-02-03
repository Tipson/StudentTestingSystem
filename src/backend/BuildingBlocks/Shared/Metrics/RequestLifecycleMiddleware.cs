using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace Metrics;

/// <summary>
/// Middleware для автоматического трекинга жизненного цикла запросов:
/// - start: запрос получен
/// - success: запрос успешно выполнен (status code 200-299)
/// - error: произошла ошибка (status code >= 400 или exception)
/// </summary>
public sealed class RequestLifecycleMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLifecycleMiddleware> _logger;
    private readonly string _serviceName;

    public RequestLifecycleMiddleware(
        RequestDelegate next,
        ILogger<RequestLifecycleMiddleware> logger,
        string serviceName)
    {
        _next = next;
        _logger = logger;
        _serviceName = serviceName;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Пропускаем метрики endpoint чтобы не создавать рекурсию
        if (context.Request.Path.StartsWithSegments("/metrics"))
        {
            await _next(context);
            return;
        }

        var method = context.Request.Method;
        var endpoint = GetEndpoint(context);
        var stopwatch = Stopwatch.StartNew();

        // 1. START - запрос получен
        RequestLifecycleMetrics.RequestLifecycle
            .WithLabels(_serviceName, method, endpoint, "start")
            .Inc();

        try
        {
            await _next(context);
            stopwatch.Stop();

            // 2. SUCCESS или ERROR в зависимости от status code
            var statusCode = context.Response.StatusCode;

            if (statusCode >= 200 && statusCode < 400)
            {
                // SUCCESS - успешный запрос
                RequestLifecycleMetrics.RequestLifecycle
                    .WithLabels(_serviceName, method, endpoint, "success")
                    .Inc();

                RequestLifecycleMetrics.SuccessfulRequestDuration
                    .WithLabels(_serviceName, method, endpoint)
                    .Observe(stopwatch.Elapsed.TotalSeconds);

                _logger.LogDebug(
                    "Запрос успешно выполнен: {Method} {Endpoint} - {StatusCode} за {Duration}мс",
                    method, endpoint, statusCode, stopwatch.ElapsedMilliseconds);
            }
            else
            {
                // ERROR - HTTP ошибка (4xx, 5xx)
                RequestLifecycleMetrics.RequestLifecycle
                    .WithLabels(_serviceName, method, endpoint, "error")
                    .Inc();

                var errorType = GetErrorType(statusCode);
                RequestLifecycleMetrics.ErrorRequestDuration
                    .WithLabels(_serviceName, method, endpoint, errorType)
                    .Observe(stopwatch.Elapsed.TotalSeconds);

                _logger.LogWarning(
                    "Запрос завершён с ошибкой: {Method} {Endpoint} - {StatusCode} за {Duration}мс",
                    method, endpoint, statusCode, stopwatch.ElapsedMilliseconds);
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            // 3. ERROR - исключение
            RequestLifecycleMetrics.RequestLifecycle
                .WithLabels(_serviceName, method, endpoint, "error")
                .Inc();

            var errorType = ex.GetType().Name;
            RequestLifecycleMetrics.ErrorRequestDuration
                .WithLabels(_serviceName, method, endpoint, errorType)
                .Observe(stopwatch.Elapsed.TotalSeconds);

            _logger.LogError(ex,
                "Исключение при обработке запроса: {Method} {Endpoint} за {Duration}мс",
                method, endpoint, stopwatch.ElapsedMilliseconds);

            // Пробрасываем исключение дальше
            throw;
        }
    }

    private static string GetEndpoint(HttpContext context)
    {
        // Используем route pattern если доступен
        var endpoint = context.GetEndpoint();
        if (endpoint is Microsoft.AspNetCore.Routing.RouteEndpoint routeEndpoint)
        {
            return routeEndpoint.RoutePattern.RawText ?? context.Request.Path;
        }

        // Иначе используем путь
        var path = context.Request.Path.Value ?? "/";

        // Удаляем ID из пути для группировки
        // /api/tests/123 -> /api/tests/{id}
        return NormalizePath(path);
    }

    private static string NormalizePath(string path)
    {
        // Простая нормализация: заменяем GUID и числа на {id}
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        
        for (int i = 0; i < segments.Length; i++)
        {
            // GUID
            if (Guid.TryParse(segments[i], out _))
            {
                segments[i] = "{id}";
            }
            // Число
            else if (int.TryParse(segments[i], out _))
            {
                segments[i] = "{id}";
            }
        }

        return "/" + string.Join("/", segments);
    }

    private static string GetErrorType(int statusCode)
    {
        return statusCode switch
        {
            400 => "BadRequest",
            401 => "Unauthorized",
            403 => "Forbidden",
            404 => "NotFound",
            409 => "Conflict",
            422 => "ValidationError",
            500 => "InternalServerError",
            502 => "BadGateway",
            503 => "ServiceUnavailable",
            504 => "GatewayTimeout",
            _ => $"Http{statusCode}"
        };
    }
}
