using Application;
using Assessment.Application.Interfaces;
using Assessment.Infrastructure.Common;
using Assessment.Infrastructure.Data;
using Assessment.Infrastructure.Grading.Clients;
using Assessment.Infrastructure.Grading.Options;
using Assessment.Infrastructure.Options;
using Assessment.Infrastructure.Repositories;
using BuildingBlocks.Api.Http;
using MassTransit;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Assessment.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddAssessmentInfrastructure(this IServiceCollection services, IConfiguration cfg)
    {
        var cs = cfg.GetConnectionString("Default") ?? cfg["DB_CONNECTION"];
        if (string.IsNullOrWhiteSpace(cs))
            throw new Exception("Строка подключения к БД Assessment не задана.");
        
        var dbOptions = cfg.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();
        
        var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder(cs)
        {
            ConnectionStringBuilder =
            {
                // Настройка пула подключений
                MaxPoolSize = dbOptions.MaxPoolSize,
                MinPoolSize = dbOptions.MinPoolSize,
                ConnectionIdleLifetime = dbOptions.ConnectionIdleLifetime,
                ConnectionPruningInterval = dbOptions.ConnectionPruningInterval,
                ConnectionLifetime = dbOptions.ConnectionLifetime,
                CommandTimeout = dbOptions.CommandTimeout,
                // TCP KeepAlive - проверка "живости" подключения
                TcpKeepAlive = true,
                TcpKeepAliveTime = dbOptions.TcpKeepAliveTime,
                TcpKeepAliveInterval = dbOptions.TcpKeepAliveInterval,
                // PostgreSQL таймауты для предотвращения зависания
                Options = $"-c statement_timeout={dbOptions.CommandTimeout * 1000} " +  // Макс время на запрос
                          "-c idle_in_transaction_session_timeout=60000", // Зависшие транзакции убиваются через 60с
                // MULTIPLEXING ОТКЛЮЧЕН - вызывал утечку физических подключений
                // ConnectionIdleLifetime не контролирует физические подключения при Multiplexing=true
                // С обычным пулом: 1 DbContext = 1 физическое подключение (проще отладка)
                Multiplexing = false,
                MaxAutoPrepare = 20, // Prepared statements кэш
                AutoPrepareMinUsages = 2 // Prepare после 2го использования
            }
        };

        dataSourceBuilder.EnableDynamicJson();
        
        // Создаём DataSource ОДИН РАЗ и регистрируем как Singleton
        var dataSource = dataSourceBuilder.Build();
        services.AddSingleton(dataSource);

        services.AddDbContextPool<AssessmentDbContext>(
            (sp, options) =>
            {
                var sharedDataSource = sp.GetRequiredService<Npgsql.NpgsqlDataSource>();
                
                options.UseNpgsql(sharedDataSource, npgsqlOptions =>
                {
                    // Command Timeout на уровне EF Core
                    npgsqlOptions.CommandTimeout(dbOptions.CommandTimeout);
                });
                
                // NoTracking по умолчанию - уменьшает overhead на 5-10%
                // Commands явно используют tracking, Queries уже используют AsNoTracking
                options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
            },
            poolSize: 128
        );
        
        // Unit of Work
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        
        // Repositories
        services.AddScoped<IQuestionRepository, QuestionRepository>();
        services.AddScoped<ITestRepository, TestRepository>();
        services.AddScoped<IAttemptRepository, AttemptRepository>();
        services.AddScoped<ITestAccessRepository, TestAccessRepository>();
        services.AddScoped<IHintUsageRepository, HintUsageRepository>();
        
        // Grading Service Client Configuration
        services.Configure<GradingServiceOptions>(
            cfg.GetSection(GradingServiceOptions.SectionName));

        // Регистрируем BearerTokenDelegatingHandler для межсервисной коммуникации
        services.AddTransient<BearerTokenDelegatingHandler>();

        // HTTP клиент к Grading Service (ручная проверка при MessageBus или все операции без MessageBus). Токен подкладывает BearerTokenDelegatingHandler.
        services.AddHttpClient<HttpGradingClient>()
            .AddHttpMessageHandler<BearerTokenDelegatingHandler>()
            .ConfigureHttpClient((serviceProvider, client) =>
            {
                var options = serviceProvider.GetRequiredService<IOptions<GradingServiceOptions>>().Value;
                client.BaseAddress = new Uri(options.Url);
                client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
            });

        var useMessageBus = cfg.GetValue<bool>("GradingService:UseMessageBus");

        if (useMessageBus)
        {
            // RabbitMQ для автоматической проверки (долгие операции с AI)
            services.AddMassTransit(x =>
            {
                x.UsingRabbitMq((context, rabbitCfg) =>
                {
                    var configuration = context.GetService<IConfiguration>()!;

                    var rabbitMqHost = configuration["RabbitMQ:Host"] ?? "localhost";
                    var rabbitMqUser = configuration["RabbitMQ:Username"] ?? "admin";
                    var rabbitMqPass = configuration["RabbitMQ:Password"] ?? "admin123";

                    rabbitCfg.Host(rabbitMqHost, "/", h =>
                    {
                        h.Username(rabbitMqUser);
                        h.Password(rabbitMqPass);
                    });

                    rabbitCfg.ConfigureEndpoints(context);
                });
            });

            services.AddScoped<IGradingClient, MessageBusGradingClient>();
        }
        else
        {
            services.AddScoped<IGradingClient, HttpGradingClient>();
        }
        
        return services;
    }
}