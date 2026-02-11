namespace Assessment.Infrastructure.Options;

public class DatabaseOptions
{
    public const string SectionName = "Database";

    // Размер пула (переопределяется через Helm values.yaml)
    public int MaxPoolSize { get; set; } = 20;
    public int MinPoolSize { get; set; } = 2;
    
    // БЫСТРОЕ ВОССТАНОВЛЕНИЕ ПОСЛЕ ПЕРЕГРУЗКИ
    // Idle подключения живут максимум 60 секунд
    // Работает ТОЛЬКО без Multiplexing=true!
    public int ConnectionIdleLifetime { get; set; } = 60;
    
    // Проверка и очистка каждые 10 секунд
    public int ConnectionPruningInterval { get; set; } = 10;
    
    // Любое подключение принудительно закрывается через 2 минуты
    // Даже если активное - защита от утечек
    public int ConnectionLifetime { get; set; } = 120;
    
    // Таймаут на выполнение команды
    public int CommandTimeout { get; set; } = 30;
    
    // TCP KeepAlive - проверка "живости" подключения
    public int TcpKeepAliveTime { get; set; } = 30;
    public int TcpKeepAliveInterval { get; set; } = 10;
}
