using System.Net;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Extensions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Api.Middlewares;

public class ExceptionHandlerMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IWebHostEnvironment env, ILogger<ExceptionHandlerMiddleware> logger)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, ex.Message);
            await HandleException(context, ex, env);
        }
    }

    private static async Task HandleException(HttpContext context, Exception ex, IWebHostEnvironment env)
    {
        var statusCode = HttpStatusCode.InternalServerError;
        var errorCode = "UNKNOWN_EXCEPTION";
        var message = "Неизвестная ошибка";

        if (ex is BaseApiException baseApiException)
        {
            statusCode = baseApiException.StatusCode;
            errorCode = baseApiException.ErrorCode;
            message = baseApiException.Message;
        }

        var stackTrace = string.Empty;
        if (env.IsDevelopment() || env.IsCompose())
            stackTrace = ex.StackTrace ?? string.Empty;

        var exceptionResponse = new
        {
            Message = message,
            ErrorCode = errorCode,
            StackTrace = stackTrace,
        };

        context.Response.StatusCode = (int)statusCode; // лучше, чем GetHashCode()
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsJsonAsync(exceptionResponse);
    }
}