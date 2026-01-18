using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Polly;
using Polly.Extensions.Http;

namespace BuildingBlocks.Integrations.Gemini;

public static class DependencyInjection
{
    public static IServiceCollection AddGeminiIntegration(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<GeminiOptions>(configuration.GetSection("Gemini"));

        services.AddHttpClient<IGeminiClient, GeminiClient>(client =>
            {
                client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
                client.DefaultRequestHeaders.Add("Accept", "application/json");
                client.Timeout = TimeSpan.FromSeconds(30);
            })
            .AddPolicyHandler(GetRetryPolicy())
            .AddPolicyHandler(GetTimeoutPolicy());

        return services;
    }

    private static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
    {
        return HttpPolicyExtensions
            .HandleTransientHttpError()
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
    }
    
    private static IAsyncPolicy<HttpResponseMessage> GetTimeoutPolicy()
    {
        return Policy.TimeoutAsync<HttpResponseMessage>(TimeSpan.FromSeconds(30));
    }
}