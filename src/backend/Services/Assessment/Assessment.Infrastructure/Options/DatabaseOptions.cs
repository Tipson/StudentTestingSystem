namespace Assessment.Infrastructure.Options;

public class DatabaseOptions
{
    public const string SectionName = "Database";

    public int MaxPoolSize { get; set; } = 20;
    public int MinPoolSize { get; set; } = 5;
    public int ConnectionIdleLifetime { get; set; } = 300;
    public int ConnectionPruningInterval { get; set; } = 10;
}
