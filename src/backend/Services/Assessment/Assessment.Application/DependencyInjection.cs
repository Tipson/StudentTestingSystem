using Microsoft.Extensions.DependencyInjection;
using Mapster;

namespace Assessment.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddAssessmentApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(AssessmentApplicationMarker).Assembly);
            // Добавляем TransactionBehavior - будет зарегистрирован в Infrastructure
        });
        
        services.AddMapster();
        
        return services;
    }

}
