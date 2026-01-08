using BuildingBlocks.Api.Extensions;

namespace Assessment.Api.Security;

public static class DependencyInjection
{
    public static IServiceCollection AddKeycloakAuth(
        this IServiceCollection services,
        IConfiguration cfg)
    {
        services.AddKeycloakBearerAuth(cfg);
        services.AddAuthorization();
        return services;
    }
}

