using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BuildingBlocks.Api.Extensions;

public static class RedisExtensions
{
    public static IServiceCollection AddRedisCache(
        this IServiceCollection services,
        IConfiguration cfg,
        string instanceName)
    {
        var cs = cfg["Redis:ConnectionString"]
                 ?? cfg.GetConnectionString("Redis");

        if (string.IsNullOrWhiteSpace(cs))
        {
            var host = cfg["RedisOptions:Host"];
            var port = cfg["RedisOptions:Port"];

            if (!string.IsNullOrWhiteSpace(host))
                cs = $"{host}:{(string.IsNullOrWhiteSpace(port) ? "6379" : port)}";
        }

        if (string.IsNullOrWhiteSpace(cs))
        {
            throw new InvalidOperationException(
                "Redis не настроен. Задай Redis:ConnectionString (или ConnectionStrings:Redis) " +
                "либо RedisOptions:Host (+ RedisOptions:Port).");
        }

        services.AddStackExchangeRedisCache(o =>
        {
            o.Configuration = cs;
            o.InstanceName = instanceName;
        });

        return services;
    }
}