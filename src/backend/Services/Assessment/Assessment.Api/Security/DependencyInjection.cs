using BuildingBlocks.Api;
using BuildingBlocks.Api.Extensions;
using Microsoft.AspNetCore.Authorization;

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

