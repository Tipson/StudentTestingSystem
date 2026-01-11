namespace Contracts.Assessment.Enums;

/// <summary>
///     Состояние попытки прохождения теста.
/// </summary>
public enum AttemptStatus
{
    /// <summary>
    ///     Попытка начата, ответы могут изменяться.
    /// </summary>
    InProgress = 0,

    /// <summary>
    ///     Попытка отправлена, ответы зафиксированы.
    /// </summary>
    Submitted = 1
}