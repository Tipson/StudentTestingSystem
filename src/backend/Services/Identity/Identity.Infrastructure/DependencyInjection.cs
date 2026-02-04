using Application;
using Identity.Application.Interfaces;
using Identity.Infrastructure.Common;
using Identity.Infrastructure.Data;
using Identity.Infrastructure.Options;
using Identity.Infrastructure.Repositories;
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

        services.AddDbContext<IdentityDbContext>((sp, options) =>
        {
            var dbOptions = cfg.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();
            var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder(cs);
            
            // Настройка пула подключений
            dataSourceBuilder.ConnectionStringBuilder.MaxPoolSize = dbOptions.MaxPoolSize;
            dataSourceBuilder.ConnectionStringBuilder.MinPoolSize = dbOptions.MinPoolSize;
            dataSourceBuilder.ConnectionStringBuilder.ConnectionIdleLifetime = dbOptions.ConnectionIdleLifetime;
            dataSourceBuilder.ConnectionStringBuilder.ConnectionPruningInterval = dbOptions.ConnectionPruningInterval;
            
            options.UseNpgsql(dataSourceBuilder.Build());
        });

        // Unit of Work для массовых операций
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IGroupRepository, GroupRepository>();

        return services;
    }
}
