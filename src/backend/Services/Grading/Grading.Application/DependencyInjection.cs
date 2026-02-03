using Application;
using Grading.Application.Strategies;
using Microsoft.Extensions.DependencyInjection;

namespace Grading.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddGradingApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(GradingApplicationMarker).Assembly));
        
        services.AddScoped<IQuestionGrader, SingleChoiceGrader>();
        services.AddScoped<IQuestionGrader, MultiChoiceGrader>();
        services.AddScoped<IQuestionGrader, ShortTextGrader>();
        services.AddScoped<IQuestionGrader, LongTextGrader>();
        
        services.AddScoped<IGradingService, GradingService>();

        return services;
    }
}