using Application;
using BuildingBlocks.Api.Extensions;
using BuildingBlocks.Api.Middlewares;
using BuildingBlocks.Api.Security;
using Media.Application;
using Media.Infrastructure;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.IdentityModel.Logging;

var builder = WebApplication.CreateBuilder(args);

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

app.UseMiddleware<IdempotencyMiddleware>();

/*if (app.Environment.IsDevelopment()) */ //Todo Не забыть раскоментировать после стабильной версии прода
{
    IdentityModelEventSource.ShowPII = false;

    app.UseSwaggerUiWithOAuth(builder.Configuration, 
        "/swagger/v1/swagger.json", 
        "Media API v1");
}

app.UseAppExceptionHandling();

// Health checks
app.MapGet("/healthz", () => Results.Ok(new
{
    status = "healthy",
    service = "media-api",
    timestamp = DateTimeOffset.UtcNow
}))
.AllowAnonymous();

app.MapControllers();

app.Run();
