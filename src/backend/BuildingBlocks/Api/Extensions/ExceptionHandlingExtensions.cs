using BuildingBlocks.Api.Middlewares;
using Microsoft.AspNetCore.Builder;

namespace BuildingBlocks.Api.Extensions;

public static class ExceptionHandlingExtensions
{
    public static IApplicationBuilder UseAppExceptionHandling(this IApplicationBuilder app) =>
        app.UseMiddleware<ExceptionHandlerMiddleware>();
}