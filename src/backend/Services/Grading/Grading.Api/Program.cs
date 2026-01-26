using Application;
using BuildingBlocks.AI;
using BuildingBlocks.Api.Extensions;
using BuildingBlocks.Api.Security;
using BuildingBlocks.Integrations.Gemini;
using Grading.Application;
using Grading.Application.Consumers;
using MassTransit;
using Microsoft.IdentityModel.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddHttpContextAccessor();

// User Context
builder.Services.AddScoped<IUserContext, UserContext>();

// Application Layer
builder.Services.AddGradingApplication();

// AI Integration
builder.Services.AddGeminiIntegration(builder.Configuration);
builder.Services.AddAIServices(builder.Configuration);

// MassTransit + RabbitMQ
builder.Services.AddMassTransit(x =>
{
    // Регистрируем Consumer
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

        // Настройка очереди для автоматической проверки
        cfg.ReceiveEndpoint("grade-attempt-queue", e =>
        {
            // Retry политика: 3 попытки с интервалом 5 секунд
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
            
            // Prefetch: сколько сообщений брать одновременно
            e.PrefetchCount = 10;
            
            // Timeout для обработки сообщения
            e.UseTimeout(t => t.Timeout = TimeSpan.FromMinutes(2));

            e.ConfigureConsumer<GradeAttemptConsumer>(context);
        });
    });
});

// Authentication & Authorization
builder.Services.AddKeycloakBearerAuth(builder.Configuration);
builder.Services.AddAuthorization();

// Swagger
builder.Services.AddSwaggerWithKeycloak(builder.Configuration, "Grading API");

// CORS (опционально - если нужен доступ с frontend)
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

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

/*if (app.Environment.IsDevelopment()) */ // Todo Не забыть раскомментировать после стабильной версии прода
{
    IdentityModelEventSource.ShowPII = true;

    app.UseSwaggerUiWithOAuth(builder.Configuration,
        "/swagger/v1/swagger.json",
        "Grading API v1");
}

app.UseAppExceptionHandling();

// Health checks
app.MapGet("/healthz", () => Results.Ok(new
    {
        status = "healthy",
        service = "grading-api",
        timestamp = DateTimeOffset.UtcNow
    }))
    .AllowAnonymous();

app.MapControllers();

app.Run();