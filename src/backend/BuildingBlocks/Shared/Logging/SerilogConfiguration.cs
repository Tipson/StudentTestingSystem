using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Serilog;
using Serilog.Events;

namespace Logging;

public static class SerilogConfiguration
{
    /// <summary>
    /// Настраивает Serilog для ASP.NET Core.
    /// </summary>
    /// <param name="builder">WebApplicationBuilder</param>
    /// <param name="serviceName">Имя сервиса для обогащения логов</param>
    public static WebApplicationBuilder ConfigureSerilog(this WebApplicationBuilder builder, string serviceName)
    {
        builder.Host.UseSerilog((context, services, configuration) =>
        {
            configuration
                .ReadFrom.Configuration(context.Configuration)
                .ReadFrom.Services(services)
                .Enrich.FromLogContext()
                .Enrich.WithMachineName()
                .Enrich.WithEnvironmentName()
                .Enrich.WithThreadId()
                .Enrich.WithProperty("ServiceName", serviceName)
                .WriteTo.Console(
                    outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {ServiceName} | {Message:lj}{NewLine}{Exception}")
                .WriteTo.File(
                    path: $"logs/{serviceName.ToLower()}-.log",
                    rollingInterval: RollingInterval.Day,
                    retainedFileCountLimit: 7,
                    outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {ServiceName} | {Message:lj}{NewLine}{Exception}");

            if (context.HostingEnvironment.IsDevelopment())
            {
                configuration.MinimumLevel.Debug();
            }
            else
            {
                configuration.MinimumLevel.Information();
            }

            configuration
                .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
                .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
                .MinimumLevel.Override("System", LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command", LogEventLevel.Warning);
        });

        return builder;
    }

    /// <summary>
    /// Добавляет Serilog request logging middleware.
    /// </summary>
    public static WebApplication UseSerilogRequestLogging(this WebApplication app)
    {
        app.UseSerilogRequestLogging(options =>
        {
            options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} ответил {StatusCode} за {Elapsed:0.0000} мс";
            
            options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
            {
                diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
                diagnosticContext.Set("RequestScheme", httpContext.Request.Scheme);
                diagnosticContext.Set("RemoteIpAddress", httpContext.Connection.RemoteIpAddress);
                diagnosticContext.Set("UserAgent", httpContext.Request.Headers["User-Agent"].ToString());
            };
        });

        return app;
    }
}
