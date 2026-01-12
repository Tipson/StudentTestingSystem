using Application;
using Assessment.Application;
using Assessment.Infrastructure;
using Assessment.Api.Security;
using BuildingBlocks.Api.Extensions;
using BuildingBlocks.Api.Middlewares;
using BuildingBlocks.Api.Security;
using Grading.Application;
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

builder.Services.AddAssessmentApplication();
builder.Services.AddAssessmentInfrastructure(builder.Configuration);
builder.Services.AddGradingService();

builder.Services.AddKeycloakAuth(builder.Configuration);
builder.Services.AddSwaggerWithKeycloak(builder.Configuration, "Assessment API");

var app = builder.Build();

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<IdempotencyMiddleware>();

/*if (app.Environment.IsDevelopment()) */ //Todo Не забыть раскоментировать после стабильной версии прода
{
    IdentityModelEventSource.ShowPII = true;

    app.UseSwaggerUiWithOAuth(builder.Configuration, 
        "/swagger/v1/swagger.json", 
        "Assessment API v1");
}

app.UseAppExceptionHandling();

app.MapControllers();

// Health checks
app.MapGet("/healthz", () => Results.Ok(new
{
    status = "healthy",
    service = "assessment-api",
    timestamp = DateTimeOffset.UtcNow
}))
.AllowAnonymous();


app.Run();