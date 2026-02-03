using Logging;
using Proctoring.Api;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.ConfigureSerilog("Proctoring.API");

try
{
    Log.Information("Запуск Proctoring API");

    builder.Services.AddOpenApi();

    var app = builder.Build();

    app.UseSerilogRequestLogging();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseHttpsRedirection();

    var summaries = new[]
    {
        "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
    };

    app.MapGet("/weatherforecast", () =>
    {
        var forecast =  Enumerable.Range(1, 5).Select(index =>
            new WeatherForecast
            (
                DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                Random.Shared.Next(-20, 55),
                summaries[Random.Shared.Next(summaries.Length)]
            ))
            .ToArray();
        return forecast;
    })
    .WithName("GetWeatherForecast");

    app.MapGet("/healthz", () => Results.Ok(new
    {
        status = "healthy",
        service = "proctoring-api",
        timestamp = DateTimeOffset.UtcNow
    }));

    Log.Information("Proctoring API успешно запущен");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Ошибка при запуске Proctoring API");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

namespace Proctoring.Api
{
    record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
    {
        public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
    }
}
