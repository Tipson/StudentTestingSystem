using Application;
using Assessment.Application.Interfaces;
using Assessment.Infrastructure.Common;
using Assessment.Infrastructure.Data;
using Assessment.Infrastructure.Grading.Clients;
using Assessment.Infrastructure.Grading.Options;
using Assessment.Infrastructure.Repositories;
using BuildingBlocks.Api.Http;
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

        // HTTP клиент к Grading Service (ручная проверка при MessageBus или все операции без MessageBus). Токен подкладывает BearerTokenDelegatingHandler.
        services.AddHttpClient<HttpGradingClient>()
            .AddHttpMessageHandler<BearerTokenDelegatingHandler>()
            .ConfigureHttpClient((serviceProvider, client) =>
            {
                var options = serviceProvider.GetRequiredService<IOptions<GradingServiceOptions>>().Value;
                client.BaseAddress = new Uri(options.Url);
                client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
            });

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

            services.AddScoped<IGradingClient, MessageBusGradingClient>();
        }
        else
        {
            services.AddScoped<IGradingClient, HttpGradingClient>();
        }

        return services;
    }
}
