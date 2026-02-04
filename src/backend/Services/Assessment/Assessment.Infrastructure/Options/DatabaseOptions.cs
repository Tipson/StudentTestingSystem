namespace Assessment.Infrastructure.Options;

public class DatabaseOptions
{
    public const string SectionName = "Database";

    // Размер пула
    public int MaxPoolSize { get; set; } = 20;
    public int MinPoolSize { get; set; } = 5;
    
    // БЫСТРОЕ ВОССТАНОВЛЕНИЕ ПОСЛЕ ПЕРЕГРУЗКИ
    // Idle подключения живут максимум 60 секунд (вместо 300s)
    public int ConnectionIdleLifetime { get; set; } = 60;
    
    // Проверка и очистка каждые 5 секунд (вместо 10s)
    public int ConnectionPruningInterval { get; set; } = 5;
    
    // Любое подключение принудительно закрывается через 2 минуты
    // Даже если активное - защита от утечек
    public int ConnectionLifetime { get; set; } = 120;
    
    // Таймаут на выполнение команды
    public int CommandTimeout { get; set; } = 30;
    
    // TCP KeepAlive - проверка "живости" подключения
    public int TcpKeepAliveTime { get; set; } = 30;
    public int TcpKeepAliveInterval { get; set; } = 10;
}
