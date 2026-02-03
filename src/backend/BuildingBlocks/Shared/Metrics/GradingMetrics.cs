using Prometheus;

namespace Metrics;

/// <summary>
/// Бизнес-метрики для Grading сервиса.
/// </summary>
public static class GradingMetrics
{
    /// <summary>
    /// Общее количество проверенных попыток.
    /// </summary>
    public static readonly Counter AttemptsGraded = Prometheus.Metrics
        .CreateCounter(
            "grading_attempts_graded_total",
            "Общее количество проверенных попыток");

    /// <summary>
    /// Количество AI проверок.
    /// </summary>
    public static readonly Counter AIGradingsPerformed = Prometheus.Metrics
        .CreateCounter(
            "grading_ai_gradings_total",
            "Количество автоматических проверок через AI",
            new CounterConfiguration
            {
                LabelNames = new[] { "result" } // success, failed, low_confidence
            });

    /// <summary>
    /// Количество ручных проверок.
    /// </summary>
    public static readonly Counter ManualGradingsPerformed = Prometheus.Metrics
        .CreateCounter(
            "grading_manual_gradings_total",
            "Количество ручных проверок преподавателем");

    /// <summary>
    /// Продолжительность AI проверки (в секундах).
    /// </summary>
    public static readonly Histogram AIGradingDuration = Prometheus.Metrics
        .CreateHistogram(
            "grading_ai_duration_seconds",
            "Продолжительность AI проверки ответа",
            new HistogramConfiguration
            {
                Buckets = Histogram.ExponentialBuckets(start: 0.1, factor: 2, count: 10) // 0.1s - 51.2s
            });

    /// <summary>
    /// Уверенность AI в проверке.
    /// </summary>
    public static readonly Histogram AIConfidence = Prometheus.Metrics
        .CreateHistogram(
            "grading_ai_confidence",
            "Уровень уверенности AI при проверке (0-1)",
            new HistogramConfiguration
            {
                Buckets = Histogram.LinearBuckets(start: 0, width: 0.1, count: 11) // 0.0 - 1.0
            });
}
