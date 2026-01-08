using BuildingBlocks.Api.Extensions;
using BuildingBlocks.Api.Middlewares;
using BuildingBlocks.Api.Middlewares;
using Contracts.Identity;
using Identity.Api.Middleware;
using Identity.Api.Security;
using Identity.Api.Web;
using Identity.Application;
using Identity.Infrastructure;
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

builder.Services.AddScoped<IUserContext, UserContextAccessor>();

builder.Services.AddIdentityApplication();
builder.Services.AddIdentityInfrastructure(builder.Configuration);

builder.Services.AddKeycloakAuth(builder.Configuration);
builder.Services.AddKeycloakAdmin(builder.Configuration);
builder.Services.AddSwaggerWithKeycloak(builder.Configuration, "Identity API");

var app = builder.Build();

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<IdempotencyMiddleware>();
app.UseMiddleware<UserSyncMiddleware>();

if (app.Environment.IsDevelopment())
{
    IdentityModelEventSource.ShowPII = true;

    app.UseSwaggerUiWithOAuth(builder.Configuration, 
        "/swagger/v1/swagger.json", 
        "Identity API v1");
}

app.UseAppExceptionHandling();
app.MapControllers();
app.Run();
