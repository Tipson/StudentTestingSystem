using Assessment.Application.Interfaces;
using Assessment.Infrastructure.Data;
using Assessment.Infrastructure.Grading;
using Assessment.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Assessment.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddAssessmentInfrastructure(this IServiceCollection services, IConfiguration cfg)
    {
        var cs = cfg.GetConnectionString("Default") ?? cfg["DB_CONNECTION"];
        if (string.IsNullOrWhiteSpace(cs))
            throw new Exception("Строка подключения к БД Assessment не задана.");

        services.AddDbContext<AssessmentDbContext>(o => o.UseNpgsql(cs));
        
        services.AddScoped<IQuestionRepository, QuestionRepository>();
        services.AddScoped<ITestRepository, TestRepository>();
        services.AddScoped<IAttemptRepository, AttemptRepository>();
        services.AddScoped<ITestAccessRepository, TestAccessRepository>();
        services.AddScoped<IHintUsageRepository, HintUsageRepository>();
        
        // Grading Service Client
        services.Configure<GradingServiceOptions>(
            cfg.GetSection(GradingServiceOptions.SectionName));

        services.AddHttpClient<IGradingClient, HttpGradingClient>((serviceProvider, client) =>
        {
            var options = serviceProvider
                .GetRequiredService<IOptions<GradingServiceOptions>>()
                .Value;
    
            client.BaseAddress = new Uri(options.Url);
            client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
        });
        
        return services;
    }
}

