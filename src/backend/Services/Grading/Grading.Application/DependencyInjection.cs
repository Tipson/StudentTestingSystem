using Application;
using Grading.Application.Services;
using Grading.Application.Strategies;
using Microsoft.Extensions.DependencyInjection;

namespace Grading.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddGradingService(this IServiceCollection services)
    {
        services.AddScoped<IQuestionGrader, SingleChoiceGrader>();
        services.AddScoped<IQuestionGrader, MultiChoiceGrader>();
        services.AddScoped<IQuestionGrader, ShortTextGrader>();
        services.AddScoped<IQuestionGrader, LongTextGrader>();
        
        services.AddScoped<IGradingService, GradingService>();
        services.AddScoped<IGradingOrchestrator, GradingOrchestrator>();

    
        return services;
    }
}