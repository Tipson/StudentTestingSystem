using Duende.AccessTokenManagement;
using BuildingBlocks.Api.Extensions;
using Contracts.Identity;
using Identity.Application.Interfaces;
using Identity.Infrastructure.Keycloak;
using Keycloak.AuthServices.Common;
using Keycloak.AuthServices.Sdk.Kiota;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Identity.Api.Security;

public static class DependencyInjection
{
    public static IServiceCollection AddKeycloakAuth(
        this IServiceCollection services,
        IConfiguration cfg)
    {
        services.AddKeycloakBearerAuth(cfg);

        services.AddAuthorization(options =>
        {
            options.AddPolicy("Admin", p => p.Requirements.Add(new RoleRequirement(UserRole.Admin)));
            options.AddPolicy("Teacher", p => p.Requirements.Add(new RoleRequirement(UserRole.Teacher)));
        });
        services.AddScoped<IAuthorizationHandler, RoleAuthorizationHandler>();
        services.AddScoped<IClaimsTransformation, RealmRolesClaimsTransformation>();
        return services;
    }
    
    public static IServiceCollection AddKeycloakAdmin(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        const string sectionName = "KeycloakAdmin";
        const string tokenName = "keycloak-admin";

        var options = configuration
            .GetKeycloakOptions<KeycloakAdminClientOptions>(sectionName)!;

        services.Configure<KeycloakAdminClientOptions>(
            configuration.GetSection(sectionName)
        );

        services.AddDistributedMemoryCache();

        services.AddHttpClient("Duende.AccessTokenManagement.BackChannelHttpClient")
            .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
            {
                UseProxy = false,
                Proxy = null
            });

        services
            .AddClientCredentialsTokenManagement()
            .AddClient(tokenName, client =>
            {
                client.ClientId = ClientId.Parse(options.Resource);
                client.ClientSecret = ClientSecret.Parse(options.Credentials.Secret);
                client.TokenEndpoint = new Uri(options.KeycloakTokenEndpoint);
            });

        services
            .AddKeycloakAdminHttpClient(configuration, keycloakClientSectionName: sectionName)
            .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
            {
                UseProxy = false,
                Proxy = null
            })
            .AddClientCredentialsTokenHandler(
                ClientCredentialsClientName.Parse(tokenName)
            );

        services.AddScoped<IKeycloakService, KeycloakService>();



        return services;
    }
}
