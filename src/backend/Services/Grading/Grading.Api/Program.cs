using Application;
using BuildingBlocks.AI;
using BuildingBlocks.Api.Extensions;
using BuildingBlocks.Api.Security;
using BuildingBlocks.Integrations.Gemini;
using Grading.Application;
using Grading.Application.Consumers;
using Logging;
using MassTransit;
using Metrics;
using Microsoft.IdentityModel.Logging;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.ConfigureSerilog("Grading.API");
builder.AddPrometheusMetrics();

try
{
    Log.Information("Запуск Grading API");

    builder.Services.AddControllers();

    builder.Services.AddHttpContextAccessor();

    builder.Services.AddScoped<IUserContext, UserContext>();

    builder.Services.AddGradingApplication();

    builder.Services.AddGeminiIntegration(builder.Configuration);
    builder.Services.AddAIServices(builder.Configuration);

    builder.Services.AddMassTransit(x =>
    {
        x.AddConsumer<GradeAttemptConsumer>();

        x.UsingRabbitMq((context, cfg) =>
        {
            var rabbitMqHost = builder.Configuration["RabbitMQ:Host"] ?? "localhost";
            var rabbitMqUser = builder.Configuration["RabbitMQ:Username"] ?? "admin";
            var rabbitMqPass = builder.Configuration["RabbitMQ:Password"] ?? "admin123";

            cfg.Host(rabbitMqHost, "/", h =>
            {
                h.Username(rabbitMqUser);
                h.Password(rabbitMqPass);
            });

            cfg.ReceiveEndpoint("grade-attempt-queue", e =>
            {
                e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
                e.PrefetchCount = 10;
                e.UseTimeout(t => t.Timeout = TimeSpan.FromMinutes(2));
                e.ConfigureConsumer<GradeAttemptConsumer>(context);
            });
        });
    });

    builder.Services.AddKeycloakBearerAuth(builder.Configuration);
    builder.Services.AddAuthorization();

    builder.Services.AddSwaggerWithKeycloak(builder.Configuration, "Grading API");

    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.AllowAnyOrigin()
                .AllowAnyMethod()
                .AllowAnyHeader();
        });
    });

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    
    // Prometheus с автоматическим трекингом start/success/error
    app.UsePrometheusMetrics("Grading.API");

    if (!app.Environment.IsDevelopment())
        app.UseHttpsRedirection();

    app.UseCors();

    app.UseAuthentication();
    app.UseAuthorization();

    {
        IdentityModelEventSource.ShowPII = false;

        app.UseSwaggerUiWithOAuth(builder.Configuration,
            "/swagger/v1/swagger.json",
            "Grading API v1");
    }

    app.UseAppExceptionHandling();

    app.MapControllers();

    app.MapGet("/healthz", () => Results.Ok(new
        {
            status = "healthy",
            service = "grading-api",
            timestamp = DateTimeOffset.UtcNow
        }))
        .AllowAnonymous();

    Log.Information("Grading API успешно запущен");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Ошибка при запуске Grading API");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
