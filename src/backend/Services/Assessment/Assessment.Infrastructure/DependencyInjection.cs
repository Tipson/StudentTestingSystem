using Application;
using Assessment.Application.Interfaces;
using Assessment.Infrastructure.Common;
using Assessment.Infrastructure.Data;
using Assessment.Infrastructure.Grading.Clients;
using Assessment.Infrastructure.Grading.Options;
using Assessment.Infrastructure.Repositories;
using MassTransit;
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

        services.AddDbContext<AssessmentDbContext>(o => 
        {
            var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder(cs);
            dataSourceBuilder.EnableDynamicJson();
            var dataSource = dataSourceBuilder.Build();
            o.UseNpgsql(dataSource);
        });
        
        // Unit of Work
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        
        // Repositories
        services.AddScoped<IQuestionRepository, QuestionRepository>();
        services.AddScoped<ITestRepository, TestRepository>();
        services.AddScoped<IAttemptRepository, AttemptRepository>();
        services.AddScoped<ITestAccessRepository, TestAccessRepository>();
        services.AddScoped<IHintUsageRepository, HintUsageRepository>();
        
        // Grading Service Client Configuration
        services.Configure<GradingServiceOptions>(
            cfg.GetSection(GradingServiceOptions.SectionName));

        var useMessageBus = cfg.GetValue<bool>("GradingService:UseMessageBus");

        if (useMessageBus)
        {
            // RabbitMQ для автоматической проверки (долгие операции с AI)
            services.AddMassTransit(x =>
            {
                x.UsingRabbitMq((context, rabbitCfg) =>
                {
                    var configuration = context.GetService<IConfiguration>()!;
                    
                    var rabbitMqHost = configuration["RabbitMQ:Host"] ?? "localhost";
                    var rabbitMqUser = configuration["RabbitMQ:Username"] ?? "admin";
                    var rabbitMqPass = configuration["RabbitMQ:Password"] ?? "admin123";

                    rabbitCfg.Host(rabbitMqHost, "/", h =>
                    {
                        h.Username(rabbitMqUser);
                        h.Password(rabbitMqPass);
                    });

                    rabbitCfg.ConfigureEndpoints(context);
                });
            });

            // HTTP клиент для ручной проверки (всегда нужен)
            services.AddHttpClient<HttpGradingClient>((serviceProvider, client) =>
            {
                var options = serviceProvider
                    .GetRequiredService<IOptions<GradingServiceOptions>>()
                    .Value;
                client.BaseAddress = new Uri(options.Url);
                client.Timeout = TimeSpan.FromSeconds(30);
            });
            
            // MessageBus клиент использует HTTP для ручной проверки
            services.AddScoped<IGradingClient, MessageBusGradingClient>();
        }
        else
        {
            // HTTP для всех операций
            services.AddHttpClient<IGradingClient, HttpGradingClient>((serviceProvider, client) =>
            {
                var options = serviceProvider
                    .GetRequiredService<IOptions<GradingServiceOptions>>()
                    .Value;
                client.BaseAddress = new Uri(options.Url);
                client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
            });
        }

        return services;
    }
}
