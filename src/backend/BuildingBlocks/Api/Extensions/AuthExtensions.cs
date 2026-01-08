using System.Security.Claims;
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

            // Настройка HTTP handler
            var handler = new SocketsHttpHandler
            {
                UseProxy = false,
                Proxy = null
            };

            // SSL bypass ТОЛЬКО если явно отключена проверка HTTPS
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
        });

    return services;
}
}