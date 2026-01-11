using Media.Application.Interfaces;
using Media.Infrastructure.Data;
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
                 ?? throw new Exception("Строка подключения к БД Assessment не задана.");


        services.AddDbContext<MediaDbContext>(o =>
            o.UseNpgsql(cs));

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