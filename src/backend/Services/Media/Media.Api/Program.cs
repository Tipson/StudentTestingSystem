using Application;
using BuildingBlocks.Api.Extensions;
using BuildingBlocks.Api.Middlewares;
using BuildingBlocks.Api.Security;
using Logging;
using Media.Application;
using Media.Infrastructure;
using Microsoft.IdentityModel.Logging;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.ConfigureSerilog("Media.API");

try
{
    Log.Information("Запуск Media API");

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

    builder.Services.AddMediaApplication();
    builder.Services.AddMediaInfrastructure(builder.Configuration);

    builder.Services.AddKeycloakBearerAuth(builder.Configuration);
    builder.Services.AddAuthorization();
    builder.Services.AddSwaggerWithKeycloak(builder.Configuration, "Storage API");

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
            "Media API v1");
    }

    app.UseAppExceptionHandling();

    app.MapGet("/healthz", () => Results.Ok(new
    {
        status = "healthy",
        service = "media-api",
        timestamp = DateTimeOffset.UtcNow
    }))
    .AllowAnonymous();

    app.MapControllers();

    Log.Information("Media API успешно запущен");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Ошибка при запуске Media API");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
