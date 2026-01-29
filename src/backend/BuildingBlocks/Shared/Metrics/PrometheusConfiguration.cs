using Microsoft.AspNetCore.Builder;
using Prometheus;

namespace Metrics;

/// <summary>
/// Extension методы для настройки Prometheus метрик.
/// </summary>
public static class PrometheusConfiguration
{
    /// <summary>
    /// Добавляет базовые HTTP метрики Prometheus.
    /// </summary>
    public static WebApplicationBuilder AddPrometheusMetrics(this WebApplicationBuilder builder)
    {
        // Prometheus автоматически собирает HTTP метрики
        return builder;
    }

    /// <summary>
    /// Настраивает Prometheus endpoints и middleware.
    /// </summary>
    public static WebApplication UsePrometheusMetrics(this WebApplication app, string? serviceName = null)
    {
        // Определяем имя сервиса
        var service = serviceName ?? app.Configuration["ServiceName"] ?? "unknown";

        // Middleware для сбора HTTP метрик (базовые от Prometheus)
        app.UseHttpMetrics(options =>
        {
            options.AddCustomLabel("service", context => service);
        });

        // Middleware для трекинга жизненного цикла (start/success/error)
        app.UseMiddleware<RequestLifecycleMiddleware>(service);

        // Endpoint для экспорта метрик
        app.MapMetrics();

        return app;
    }
}
