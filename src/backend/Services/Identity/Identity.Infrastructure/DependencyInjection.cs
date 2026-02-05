using Application;
using Identity.Application.Interfaces;
using Identity.Infrastructure.Behaviors;
using Identity.Infrastructure.Common;
using Identity.Infrastructure.Data;
using Identity.Infrastructure.Options;
using Identity.Infrastructure.Repositories;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Identity.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityInfrastructure(this IServiceCollection services, IConfiguration cfg)
    {
        var cs = cfg.GetConnectionString("Default") ?? cfg["DB_CONNECTION"];
        if (string.IsNullOrWhiteSpace(cs))
            throw new Exception("Строка подключения к БД Identity не задана.");

        services.Configure<DatabaseOptions>(cfg.GetSection(DatabaseOptions.SectionName));

        // ===== КРИТИЧНО: NpgsqlDataSource должен быть SINGLETON! =====
        // Один DataSource = Один connection pool на всё приложение
        var dbOptions = cfg.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();

        var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder(cs)
        {
            ConnectionStringBuilder =
            {
                MaxPoolSize = dbOptions.MaxPoolSize,
                MinPoolSize = dbOptions.MinPoolSize,
                ConnectionIdleLifetime = dbOptions.ConnectionIdleLifetime,
                ConnectionPruningInterval = dbOptions.ConnectionPruningInterval,
                ConnectionLifetime = dbOptions.ConnectionLifetime,
                CommandTimeout = dbOptions.CommandTimeout,

                // Производительность / стабильность
                Multiplexing = false,
                MaxAutoPrepare = 20,
                AutoPrepareMinUsages = 2
            }
        };

        // Создаём DataSource ОДИН РАЗ и регистрируем как Singleton
        var dataSource = dataSourceBuilder.Build();
        services.AddSingleton(dataSource);

        // DbContext использует готовый Singleton DataSource
        services.AddDbContext<IdentityDbContext>((sp, options) =>
        {
            var sharedDataSource = sp.GetRequiredService<Npgsql.NpgsqlDataSource>();

            options.UseNpgsql(sharedDataSource, npgsqlOptions =>
            {
                // ❌ ВРЕМЕННО ОТКЛЮЧЕНО
                // npgsqlOptions.EnableRetryOnFailure(3, TimeSpan.FromSeconds(2), null);

                npgsqlOptions.CommandTimeout(dbOptions.CommandTimeout);
            });
        });

        // Unit of Work для массовых операций
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IGroupRepository, GroupRepository>();

        // MediatR Pipeline Behavior для автоматического SaveChanges
        services.AddScoped(typeof(IPipelineBehavior<,>), typeof(TransactionBehavior<,>));

        return services;
    }
}
