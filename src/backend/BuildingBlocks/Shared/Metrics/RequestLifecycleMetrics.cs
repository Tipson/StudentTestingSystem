using Prometheus;

namespace Metrics;

/// <summary>
/// Метрики для отслеживания жизненного цикла HTTP запросов.
/// </summary>
public static class RequestLifecycleMetrics
{
    /// <summary>
    /// Счётчик запросов с тегами start/success/error.
    /// </summary>
    public static readonly Counter RequestLifecycle = Prometheus.Metrics
        .CreateCounter(
            "http_request_lifecycle_total",
            "Отслеживание жизненного цикла HTTP запросов",
            new CounterConfiguration
            {
                LabelNames = new[] { "service", "method", "endpoint", "status" }
                // status: start, success, error
            });

    /// <summary>
    /// Продолжительность успешных запросов.
    /// </summary>
    public static readonly Histogram SuccessfulRequestDuration = Prometheus.Metrics
        .CreateHistogram(
            "http_request_success_duration_seconds",
            "Продолжительность успешных запросов",
            new HistogramConfiguration
            {
                LabelNames = new[] { "service", "method", "endpoint" },
                Buckets = Histogram.ExponentialBuckets(start: 0.001, factor: 2, count: 15)
                // 1ms, 2ms, 4ms, 8ms ... до 16 секунд
            });

    /// <summary>
    /// Продолжительность запросов с ошибками.
    /// </summary>
    public static readonly Histogram ErrorRequestDuration = Prometheus.Metrics
        .CreateHistogram(
            "http_request_error_duration_seconds",
            "Продолжительность запросов завершившихся ошибкой",
            new HistogramConfiguration
            {
                LabelNames = new[] { "service", "method", "endpoint", "error_type" },
                Buckets = Histogram.ExponentialBuckets(start: 0.001, factor: 2, count: 15)
            });
}
