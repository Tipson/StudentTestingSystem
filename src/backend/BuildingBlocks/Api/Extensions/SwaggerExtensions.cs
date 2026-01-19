using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi;

namespace BuildingBlocks.Api.Extensions;

public static class SwaggerExtensions
{
    public static IServiceCollection AddSwaggerWithKeycloak(
        this IServiceCollection services,
        IConfiguration cfg,
        string serviceTitle,
        string keycloakSection = "Keycloak",
        string swaggerSection = "SwaggerAuth")
    {
        var authority = cfg[$"{keycloakSection}:Authority"]
                        ?? throw new InvalidOperationException("Отсутствует конфигурация секции 'Keycloak:Authority'.");

        var scopes = cfg.GetSection($"{swaggerSection}:Scopes").Get<string[]>()
                    ?? ["openid", "profile", "email"];
        var scopeList = scopes
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct(StringComparer.Ordinal)
            .ToList();

        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = serviceTitle,
                Version = "v1",
                Description = $"{serviceTitle} - автоматическая документация"
            });

            // Подключаем XML комментарии
            var xmlFile = $"{Assembly.GetEntryAssembly()?.GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            if (File.Exists(xmlPath))
            {
                c.IncludeXmlComments(xmlPath);
            }

            const string schemeId = "Keycloak";

            c.AddSecurityDefinition(schemeId, new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.OAuth2,
                Scheme = "oauth2",
                In = ParameterLocation.Header,
                Flows = new OpenApiOAuthFlows
                {
                    AuthorizationCode = new OpenApiOAuthFlow
                    {
                        AuthorizationUrl = new Uri($"{authority}/protocol/openid-connect/auth"),
                        TokenUrl = new Uri($"{authority}/protocol/openid-connect/token"),
                        Scopes = scopeList.ToDictionary(x => x, x => x, StringComparer.Ordinal)
                    }
                }
            });

            c.AddSecurityRequirement(document => new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference(schemeId, document)] = scopeList
            });
        });

        return services;
    }
    
    public static IApplicationBuilder UseSwaggerUiWithOAuth(
        this IApplicationBuilder app,
        IConfiguration cfg,
        string swaggerEndpoint = "/swagger/v1/swagger.json",
        string title = "API v1",
        string swaggerSection = "SwaggerAuth")
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint(swaggerEndpoint, title);

            var clientId = cfg[$"{swaggerSection}:ClientId"] ?? "swagger";
            var scopes = cfg.GetSection($"{swaggerSection}:Scopes").Get<string[]>()
                         ?? ["openid", "profile", "email"];

            c.OAuthClientId(clientId);
            c.OAuthScopes(scopes);
            c.OAuthUsePkce();
        });

        return app;
    }
}
