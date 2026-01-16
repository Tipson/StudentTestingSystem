namespace Assessment.Infrastructure.Grading.Options;

public sealed class GradingServiceOptions
{
    public const string SectionName = "GradingService";

    public string Url { get; set; } = string.Empty;
    public int TimeoutSeconds { get; set; } = 30;
}