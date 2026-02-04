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
using Microsoft.Extensions.Options;

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
            var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder(cs)
            {
                ConnectionStringBuilder =
                {
                    // Настройка пула подключений
                    MaxPoolSize = dbOptions.MaxPoolSize,
                    MinPoolSize = dbOptions.MinPoolSize,
                    ConnectionIdleLifetime = dbOptions.ConnectionIdleLifetime,
                    ConnectionPruningInterval = dbOptions.ConnectionPruningInterval,
                    CommandTimeout = dbOptions.CommandTimeout
                }
            };
            //Todo
            /*options.UseNpgsql(dataSourceBuilder.Build(), npgsqlOptions => 
            {
               npgsqlOptions.EnableRetryOnFailure(
                   maxRetryCount: 3,
                   maxRetryDelay: TimeSpan.FromSeconds(5),
                   errorCodesToAdd: null);
           });*/
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
