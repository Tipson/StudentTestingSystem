using Media.Application.Interfaces;
using Media.Infrastructure.Data;
using Media.Infrastructure.Repositories;
using Media.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Minio;

namespace Media.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddMediaInfrastructure(this IServiceCollection services, IConfiguration cfg)
    {
        var cs = cfg.GetConnectionString("Default")
                 ?? throw new InvalidOperationException("Connection string 'Default' not found");

        services.AddDbContext<MediaDbContext>(o => o.UseNpgsql(cs));
        services.AddScoped<IMediaRepository, MediaRepository>();

        services.Configure<StorageOptions>(cfg.GetSection("StorageOptions"));
        var options = cfg.GetSection("StorageOptions").Get<StorageOptions>() ?? new StorageOptions();

        services.AddSingleton<IMinioClient>(_ =>
            new MinioClient()
                .WithEndpoint(options.Host)
                .WithCredentials(options.AccessKey, options.SecretKey)
                .WithSSL(options.WithSsl)
                .Build());

        services.AddScoped<IStorageProvider, StorageProvider>();

        return services;
    }
}