using Application;
using BuildingBlocks.AI;
using BuildingBlocks.Api.Extensions;
using BuildingBlocks.Api.Security;
using BuildingBlocks.Integrations.Gemini;
using Grading.Application;
using Microsoft.IdentityModel.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddHttpContextAccessor();

// User Context
builder.Services.AddScoped<IUserContext, UserContext>();

// Application Layer
builder.Services.AddGradingService();

// AI Integration
builder.Services.AddGeminiIntegration(builder.Configuration);
builder.Services.AddAIServices(builder.Configuration);

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