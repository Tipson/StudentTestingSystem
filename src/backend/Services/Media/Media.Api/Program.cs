using Application;
using BuildingBlocks.Api.Extensions;
using BuildingBlocks.Api.Middlewares;
using BuildingBlocks.Api.Security;
using Media.Application;
using Media.Infrastructure;
using Microsoft.IdentityModel.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddHttpContextAccessor();

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration["Redis:ConnectionString"] 
                            ?? "localhost:6379";
    options.InstanceName = "Idempotency:";
});

builder.Services.AddScoped<IUserContext, UserContext>();

builder.Services.AddMediaApplication();
builder.Services.AddMediaInfrastructure(builder.Configuration);

builder.Services.AddKeycloakBearerAuth(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddSwaggerWithKeycloak(builder.Configuration, "Storage API");

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