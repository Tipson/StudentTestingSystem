using Media.Application.Interfaces;
using Media.Infrastructure.Data;
using Media.Infrastructure.Options;
using Media.Infrastructure.Repositories;
using Media.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Minio;

namespace Media.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddMediaInfrastructure(
        this IServiceCollection services,
        IConfiguration cfg)
    {
        var cs = cfg.GetConnectionString("Default")
                 ?? throw new Exception("Строка подключения к БД Media не задана.");

        services.AddDbContext<MediaDbContext>((sp, options) =>
        {
            var dbOptions = sp.GetRequiredService<IOptions<DatabaseOptions>>().Value;
            var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder(cs);
            
            // Настройка пула подключений
            dataSourceBuilder.ConnectionStringBuilder.MaxPoolSize = dbOptions.MaxPoolSize;
            dataSourceBuilder.ConnectionStringBuilder.MinPoolSize = dbOptions.MinPoolSize;
            dataSourceBuilder.ConnectionStringBuilder.ConnectionIdleLifetime = dbOptions.ConnectionIdleLifetime;
            dataSourceBuilder.ConnectionStringBuilder.ConnectionPruningInterval = dbOptions.ConnectionPruningInterval;
            
            options.UseNpgsql(dataSourceBuilder.Build());
        });

        services.AddScoped<IMediaRepository, MediaRepository>();

        services.Configure<StorageOptions>(
            cfg.GetSection("StorageOptions"));

        services.AddSingleton<IMinioClient>(sp =>
        {
            var opt = sp.GetRequiredService<IOptions<StorageOptions>>().Value;

            var socketsHandler = new SocketsHttpHandler
            {
                UseProxy = false,
                Proxy = null
            };

            var httpClient = new HttpClient(socketsHandler)
            {
                Timeout = TimeSpan.FromMinutes(2)
            };

            return new MinioClient()
                .WithEndpoint(opt.Host, opt.Port)
                .WithCredentials(opt.AccessKey, opt.SecretKey)
                .WithSSL(opt.WithSsl)
                .WithHttpClient(httpClient)
                .Build();
        });

        services.AddScoped<IStorageProvider, StorageProvider>();

        return services;
    }
}