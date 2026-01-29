using Prometheus;

namespace Metrics;

/// <summary>
/// Бизнес-метрики для Identity сервиса.
/// </summary>
public static class IdentityMetrics
{
    /// <summary>
    /// Общее количество созданных пользователей.
    /// </summary>
    public static readonly Counter UsersCreated = Prometheus.Metrics
        .CreateCounter(
            "identity_users_created_total",
            "Общее количество созданных пользователей");

    /// <summary>
    /// Общее количество активаций пользователей.
    /// </summary>
    public static readonly Counter UsersActivated = Prometheus.Metrics
        .CreateCounter(
            "identity_users_activated_total",
            "Общее количество активаций пользователей");

    /// <summary>
    /// Общее количество деактиваций пользователей.
    /// </summary>
    public static readonly Counter UsersDeactivated = Prometheus.Metrics
        .CreateCounter(
            "identity_users_deactivated_total",
            "Общее количество деактиваций пользователей");

    /// <summary>
    /// Общее количество созданных групп.
    /// </summary>
    public static readonly Counter GroupsCreated = Prometheus.Metrics
        .CreateCounter(
            "identity_groups_created_total",
            "Общее количество созданных групп");

    /// <summary>
    /// Текущее количество активных групп.
    /// </summary>
    public static readonly Gauge ActiveGroups = Prometheus.Metrics
        .CreateGauge(
            "identity_active_groups",
            "Количество активных групп");

    /// <summary>
    /// Распределение пользователей по ролям.
    /// </summary>
    public static readonly Counter UserRoleChanges = Prometheus.Metrics
        .CreateCounter(
            "identity_user_role_changes_total",
            "Количество изменений ролей пользователей",
            new CounterConfiguration
            {
                LabelNames = new[] { "role" } // admin, teacher, student
            });
}
