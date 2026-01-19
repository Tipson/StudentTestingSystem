using BuildingBlocks.AI.Helpers;
using BuildingBlocks.AI.Services.Generation;
using BuildingBlocks.AI.Services.Grading;
using BuildingBlocks.AI.Services.Hints;
using BuildingBlocks.Integrations.Gemini;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BuildingBlocks.AI;

public static class DependencyInjection
{
    public static IServiceCollection AddAIServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Конфигурация AI
        services.Configure<AIOptions>(configuration.GetSection("AI"));
        
        // Gemini Integration
        services.AddGeminiIntegration(configuration);

        services.AddScoped<IMediaHelper, MediaHelper>();
        services.AddHttpContextAccessor();
        
        services.AddHttpClient("MediaApiClient", client =>
            {
                var mediaServiceUrl = configuration["Services:MediaService:Url"] 
                                      ?? "http://media-api:5003";
                client.BaseAddress = new Uri(mediaServiceUrl);
                client.Timeout = TimeSpan.FromMinutes(2);
            })
            .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
            {
                UseProxy = false,
                Proxy = null,
                ConnectTimeout = TimeSpan.FromSeconds(10)
            });
        
        var aiOptions = configuration.GetSection("AI").Get<AIOptions>() ?? new AIOptions();

        // Регистрация сервисов в зависимости от конфигурации
        if (aiOptions.Enabled)
        {
            // AI включен - используем Gemini реализации
            services.AddScoped<IAIHintService, HintService>();
            services.AddScoped<IAIGradingService, GradingService>();
            services.AddScoped<IAITestGeneratorService, TestGeneratorService>();
        }
        else
        {
            // AI отключен - используем заглушки
            services.AddScoped<IAIHintService, DisabledAIHintService>();
            services.AddScoped<IAIGradingService, DisabledAIGradingService>();
            services.AddScoped<IAITestGeneratorService, DisabledAITestGeneratorService>();
        }

        return services;
    }
}