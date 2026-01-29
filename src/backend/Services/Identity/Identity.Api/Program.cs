using Application;
using BuildingBlocks.Api.Extensions;
using BuildingBlocks.Api.Middlewares;
using BuildingBlocks.Api.Security;
using Identity.Api.Middleware;
using Identity.Api.Security;
using Identity.Application;
using Identity.Infrastructure;
using Logging;
using Metrics;
using Microsoft.IdentityModel.Logging;
using Prometheus;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.ConfigureSerilog("Identity.API");
builder.AddPrometheusMetrics();

try
{
    Log.Information("Запуск Identity API");

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

    builder.Services.AddIdentityApplication();
    builder.Services.AddIdentityInfrastructure(builder.Configuration);

    builder.Services.AddKeycloakAuth(builder.Configuration);
    builder.Services.AddKeycloakAdmin(builder.Configuration);
    builder.Services.AddSwaggerWithKeycloak(builder.Configuration, "Identity API");

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
    
    app.UseRouting();
    
    app.UsePrometheusMetrics("Identity.API");

    app.UseCors();

    app.UseAuthentication();
    app.UseAuthorization();

    app.UseMiddleware<IdempotencyMiddleware>();
    app.UseMiddleware<UserSyncMiddleware>();

    {
        IdentityModelEventSource.ShowPII = false;

        app.UseSwaggerUiWithOAuth(builder.Configuration, 
            "/swagger/v1/swagger.json", 
            "Identity API v1");
    }

    app.UseAppExceptionHandling();
    app.MapControllers();

    app.MapMetrics().AllowAnonymous();
    app.MapGet("/healthz", () => Results.Ok(new
    {
        status = "healthy",
        service = "identity-api",
        timestamp = DateTimeOffset.UtcNow
    }))
    .AllowAnonymous();

    Log.Information("Identity API успешно запущен");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Ошибка при запуске Identity API");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
