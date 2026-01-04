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

        Console.WriteLine($"🔐 Keycloak Authority: {opt.Authority}");
        Console.WriteLine($"🔐 Metadata URL: {opt.Authority}/.well-known/openid-configuration");

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(o =>
            {
                o.Authority = opt.Authority;
                o.RequireHttpsMetadata = opt.RequireHttpsMetadata;
                o.MapInboundClaims = false;
                
                // Явно указываем URL метаданных
                o.MetadataAddress = $"{opt.Authority}/.well-known/openid-configuration";
                
                // ВАЖНО: Отключаем прокси для localhost
                o.BackchannelHttpHandler = new SocketsHttpHandler
                {
                    UseProxy = false,
                    Proxy = null,
                    SslOptions = new System.Net.Security.SslClientAuthenticationOptions
                    {
                        RemoteCertificateValidationCallback = (sender, certificate, chain, errors) => true // Только для localhost!
                    }
                };

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
                    OnAuthenticationFailed = context =>
                    {
                        Console.WriteLine($"❌ Auth failed: {context.Exception.Message}");
                        if (context.Exception.InnerException != null)
                            Console.WriteLine($"   Inner: {context.Exception.InnerException.Message}");
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = context =>
                    {
                        Console.WriteLine("✅ Token validated successfully");
                        var userId = context.Principal?.FindFirst("sub")?.Value;
                        Console.WriteLine($"   User ID: {userId}");
                        return Task.CompletedTask;
                    },
                    OnMessageReceived = context =>
                    {
                        Console.WriteLine("📨 Token received");
                        return Task.CompletedTask;
                    }
                };
            });

        return services;
    }
}