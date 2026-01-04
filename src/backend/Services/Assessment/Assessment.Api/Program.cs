using Assessment.Application;
using Assessment.Infrastructure;
using Assessment.Api.Security;
using Assessment.Application.Services;
using BuildingBlocks.Api.Extensions;
using Contracts.Identity;
using Microsoft.IdentityModel.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IUserContext, UserContext>();


builder.Services.AddAssessmentApplication();
builder.Services.AddAssessmentInfrastructure(builder.Configuration);

builder.Services.AddKeycloakAuth(builder.Configuration);
builder.Services.AddSwaggerWithKeycloak(builder.Configuration, "Assessment API");

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
        "Assessment API v1");
}

app.UseAppExceptionHandling();

app.MapControllers();

app.Run();
