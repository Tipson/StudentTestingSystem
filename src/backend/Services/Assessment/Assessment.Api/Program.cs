using Application;
using Assessment.Application;
using Assessment.Infrastructure;
using Assessment.Api.Security;
using BuildingBlocks.AI;
using BuildingBlocks.Api.Extensions;
using BuildingBlocks.Api.Middlewares;
using BuildingBlocks.Api.Security;
using Logging;
using Microsoft.IdentityModel.Logging;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.ConfigureSerilog("Assessment.API");

try
{
    Log.Information("Запуск Assessment API");

    builder.Services.AddControllers();

    builder.Services.AddHttpContextAccessor();

    var redisHost = builder.Configuration["RedisOptions:Host"];
    var redisPort = builder.Configuration["RedisOptions:Port"] ?? "6379";

    if (string.IsNullOrWhiteSpace(redisHost))
        throw new Exception("RedisOptions:Host не задан.");

    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = $"{redisHost}:{redisPort}";
        options.InstanceName = "Idempotency:";
    });

    builder.Services.AddScoped<IUserContext, UserContext>();

    builder.Services.AddAssessmentApplication();
    builder.Services.AddAssessmentInfrastructure(builder.Configuration);

    builder.Services.AddAIServices(builder.Configuration);

    builder.Services.AddKeycloakAuth(builder.Configuration);
    builder.Services.AddSwaggerWithKeycloak(builder.Configuration, "Assessment API");

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

    if (!app.Environment.IsDevelopment())
        app.UseHttpsRedirection();

    app.UseCors();

    app.UseAuthentication();
    app.UseAuthorization();

    app.UseMiddleware<IdempotencyMiddleware>();

    {
        IdentityModelEventSource.ShowPII = false;

        app.UseSwaggerUiWithOAuth(builder.Configuration, 
            "/swagger/v1/swagger.json", 
            "Assessment API v1");
    }

    app.UseAppExceptionHandling();

    app.MapControllers();

    app.MapGet("/healthz", () => Results.Ok(new
    {
        status = "healthy",
        service = "assessment-api",
        timestamp = DateTimeOffset.UtcNow
    }))
    .AllowAnonymous();

    Log.Information("Assessment API успешно запущен");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Ошибка при запуске Assessment API");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
