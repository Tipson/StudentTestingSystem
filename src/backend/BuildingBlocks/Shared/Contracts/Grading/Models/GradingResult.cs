using Contracts.Grading.Enums;

namespace Contracts.Grading.Models;

/// <summary>
/// Результат проверки ответа на вопрос.
/// </summary>
public sealed record GradingResult
{
    public bool IsCorrect { get; init; }
    public int PointsAwarded { get; init; }
    public GradingType Type { get; init; }
    public bool RequiresManualReview { get; init; }
    public string? Feedback { get; init; } // Для будущего: объяснение почему неправильно

    public static GradingResult Correct(int points) => new()
    {
        IsCorrect = true,
        PointsAwarded = points,
        Type = GradingType.Automatic,
        RequiresManualReview = false
    };

    public static GradingResult Incorrect() => new()
    {
        IsCorrect = false,
        PointsAwarded = 0,
        Type = GradingType.Automatic,
        RequiresManualReview = false
    };

    public static GradingResult Partial(int points) => new()
    {
        IsCorrect = false,
        PointsAwarded = points,
        Type = GradingType.Automatic,
        RequiresManualReview = false
    };

    public static GradingResult ManualReviewRequired() => new()
    {
        IsCorrect = false,
        PointsAwarded = 0,
        Type = GradingType.Manual,
        RequiresManualReview = true
    };

    public static GradingResult Manual(int points, string? comment = null) => new()
    {
        IsCorrect = points > 0,
        PointsAwarded = points,
        Type = GradingType.Manual,
        RequiresManualReview = false,
        Feedback = comment
    };
}