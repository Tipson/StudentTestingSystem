using Media.Application.Interfaces;
using Media.Application.Services;
using Mapster;
using Microsoft.Extensions.DependencyInjection;

namespace Media.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddMediaApplication(this IServiceCollection services)
    {
        TypeAdapterConfig.GlobalSettings.Scan(typeof(DependencyInjection).Assembly);

        services.AddScoped<IFileService, FileService>();
        services.AddMapster();
        return services;
    }
}