using BuildingBlocks.Api.Extensions;
using Contracts.Identity;
using Media.Api.Security;
using Media.Application;
using Media.Infrastructure;
using Microsoft.IdentityModel.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddHttpContextAccessor();
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

if (app.Environment.IsDevelopment())
{
    IdentityModelEventSource.ShowPII = true;

    app.UseSwaggerUiWithOAuth(builder.Configuration, 
        "/swagger/v1/swagger.json", 
        "Storage API v1");
}

app.UseAppExceptionHandling();

app.MapControllers();

app.Run();