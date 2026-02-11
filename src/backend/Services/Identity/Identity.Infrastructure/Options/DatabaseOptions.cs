namespace Identity.Infrastructure.Options;

public class DatabaseOptions
{
    public const string SectionName = "Database";

    public int MaxPoolSize { get; set; } = 15;
    public int MinPoolSize { get; set; } = 3;
    public int ConnectionIdleLifetime { get; set; } = 60;
    public int ConnectionPruningInterval { get; set; } = 5;
    public int ConnectionLifetime { get; set; } = 120;
    public int CommandTimeout { get; set; } = 30;
    public int TcpKeepAliveTime { get; set; } = 30;
    public int TcpKeepAliveInterval { get; set; } = 10;
}
