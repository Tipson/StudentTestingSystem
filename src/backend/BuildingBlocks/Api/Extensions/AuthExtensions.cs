using System.Security.Claims;
using System.Text.Json;
using BuildingBlocks.Api.Options;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace BuildingBlocks.Api.Extensions;

public static class AuthExtensions
{
    public static IServiceCollection AddKeycloakBearerAuth(
        this IServiceCollection services,
        IConfiguration cfg,
        string keycloakSection = "Keycloak")
    {
        services.Configure<KeycloakOptions>(cfg.GetSection(keycloakSection));

        var opt = cfg.GetSection(keycloakSection).Get<KeycloakOptions>()
                  ?? throw new InvalidOperationException(
                      $"Missing configuration section '{keycloakSection}'.");

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(o =>
            {
                o.Authority = opt.Authority;
                o.RequireHttpsMetadata = opt.RequireHttpsMetadata;
                o.MapInboundClaims = false;
                o.MetadataAddress = $"{opt.Authority}/.well-known/openid-configuration";

                var handler = new SocketsHttpHandler
                {
                    UseProxy = false,
                    Proxy = null
                };

                if (!opt.RequireHttpsMetadata)
                {
                    handler.SslOptions = new System.Net.Security.SslClientAuthenticationOptions
                    {
                        RemoteCertificateValidationCallback = (_, _, _, _) => true
                    };
                }

                o.BackchannelHttpHandler = handler;

                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = opt.Authority,
                    ValidateAudience = opt.ValidateAudience,
                    ValidateIssuerSigningKey = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(5),
                    NameClaimType = "preferred_username",
                    RoleClaimType = ClaimTypes.Role
                };

                o.Events = new JwtBearerEvents
                {
                    OnTokenValidated = context =>
                    {
                        if (context.Principal?.Identity is ClaimsIdentity identity)
                        {
                            MapKeycloakRolesToClaims(identity);
                        }
                        return Task.CompletedTask;
                    }
                };
            });

        return services;
    }

    /// <summary>
    /// Извлекает роли из realm_access и resource_access Keycloak
    /// и добавляет их как стандартные Role claims.
    /// </summary>
    private static void MapKeycloakRolesToClaims(ClaimsIdentity identity)
    {
        // Роли из realm_access
        var realmAccess = identity.FindFirst("realm_access")?.Value;
        if (!string.IsNullOrEmpty(realmAccess))
        {
            ExtractRolesFromJson(identity, realmAccess);
        }

        // Роли из resource_access (опционально, для client-specific ролей)
        var resourceAccess = identity.FindFirst("resource_access")?.Value;
        if (!string.IsNullOrEmpty(resourceAccess))
        {
            try
            {
                using var doc = JsonDocument.Parse(resourceAccess);
                foreach (var client in doc.RootElement.EnumerateObject())
                {
                    if (client.Value.TryGetProperty("roles", out var roles))
                    {
                        foreach (var role in roles.EnumerateArray())
                        {
                            var roleName = role.GetString();
                            if (!string.IsNullOrEmpty(roleName) && 
                                !identity.HasClaim(ClaimTypes.Role, roleName))
                            {
                                identity.AddClaim(new Claim(ClaimTypes.Role, roleName));
                            }
                        }
                    }
                }
            }
            catch (JsonException)
            {
                // Игнорируем ошибки парсинга
            }
        }
    }

    private static void ExtractRolesFromJson(ClaimsIdentity identity, string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("roles", out var roles))
            {
                foreach (var role in roles.EnumerateArray())
                {
                    var roleName = role.GetString();
                    if (!string.IsNullOrEmpty(roleName) && 
                        !identity.HasClaim(ClaimTypes.Role, roleName))
                    {
                        identity.AddClaim(new Claim(ClaimTypes.Role, roleName));
                    }
                }
            }
        }
        catch (JsonException)
        {
            // Игнорируем ошибки парсинга
        }
    }
}