namespace Identity.Infrastructure.Options;

public class DatabaseOptions
{
    public const string SectionName = "Database";

    public int MaxPoolSize { get; set; } = 15;
    public int MinPoolSize { get; set; } = 3;
    public int ConnectionIdleLifetime { get; set; } = 300;
    public int ConnectionPruningInterval { get; set; } = 10;
}
