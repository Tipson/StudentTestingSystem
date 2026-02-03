using Prometheus;

namespace Metrics;

/// <summary>
/// Бизнес-метрики для Assessment сервиса.
/// </summary>
public static class AssessmentMetrics
{
    /// <summary>
    /// Общее количество созданных тестов.
    /// </summary>
    public static readonly Counter TestsCreated = Prometheus.Metrics
        .CreateCounter(
            "assessment_tests_created_total",
            "Общее количество созданных тестов");

    /// <summary>
    /// Общее количество начатых попыток.
    /// </summary>
    public static readonly Counter AttemptsStarted = Prometheus.Metrics
        .CreateCounter(
            "assessment_attempts_started_total",
            "Общее количество начатых попыток тестирования");

    /// <summary>
    /// Общее количество завершенных попыток.
    /// </summary>
    public static readonly Counter AttemptsCompleted = Prometheus.Metrics
        .CreateCounter(
            "assessment_attempts_completed_total",
            "Общее количество завершенных попыток тестирования");

    /// <summary>
    /// Текущее количество активных попыток (в процессе).
    /// </summary>
    public static readonly Gauge ActiveAttempts = Prometheus.Metrics
        .CreateGauge(
            "assessment_active_attempts",
            "Количество попыток тестирования в процессе выполнения");

    /// <summary>
    /// Продолжительность выполнения попытки (в секундах).
    /// </summary>
    public static readonly Histogram AttemptDuration = Prometheus.Metrics
        .CreateHistogram(
            "assessment_attempt_duration_seconds",
            "Продолжительность выполнения попытки тестирования",
            new HistogramConfiguration
            {
                Buckets = Histogram.LinearBuckets(start: 60, width: 60, count: 10) // 1-10 минут
            });

    /// <summary>
    /// Распределение баллов по попыткам.
    /// </summary>
    public static readonly Histogram AttemptScores = Prometheus.Metrics
        .CreateHistogram(
            "assessment_attempt_scores",
            "Распределение баллов по попыткам тестирования",
            new HistogramConfiguration
            {
                Buckets = Histogram.LinearBuckets(start: 0, width: 10, count: 11) // 0-100%
            });
}
