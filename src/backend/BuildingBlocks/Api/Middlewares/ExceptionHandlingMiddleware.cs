using System.Net;
using BuildingBlocks.Api.Exceptions.Base;
using BuildingBlocks.Api.Extensions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
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
        var (statusCode, errorCode, message) = MapException(ex);

        var stackTrace = string.Empty;
        if (env.IsDevelopment() || env.IsCompose())
            stackTrace = ex.StackTrace ?? string.Empty;

        var exceptionResponse = new
        {
            Message = message,
            ErrorCode = errorCode,
            StackTrace = stackTrace,
        };

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsJsonAsync(exceptionResponse);
    }

    /// <summary>
    /// Маппинг исключений на HTTP-статусы и коды ошибок.
    /// </summary>
    private static (HttpStatusCode StatusCode, string ErrorCode, string Message) MapException(Exception ex)
    {
        return ex switch
        {
            // Кастомные API-исключения (приоритет)
            BaseApiException apiEx => (apiEx.StatusCode, apiEx.ErrorCode, apiEx.Message),

            // Валидация аргументов → 400 Bad Request
            ArgumentNullException argNullEx => (
                HttpStatusCode.BadRequest,
                "VALIDATION_ERROR",
                $"Параметр не может быть null: {argNullEx.ParamName}"
            ),
            
            ArgumentOutOfRangeException argRangeEx => (
                HttpStatusCode.BadRequest,
                "VALIDATION_ERROR",
                argRangeEx.Message
            ),
            
            ArgumentException argEx => (
                HttpStatusCode.BadRequest,
                "VALIDATION_ERROR",
                argEx.Message
            ),

            // Ошибки бизнес-логики → 400 Bad Request
            InvalidOperationException invalidOpEx => (
                HttpStatusCode.BadRequest,
                "INVALID_OPERATION",
                invalidOpEx.Message
            ),

            // Неподдерживаемые операции → 400 Bad Request
            NotSupportedException notSupportedEx => (
                HttpStatusCode.BadRequest,
                "NOT_SUPPORTED",
                notSupportedEx.Message
            ),
            
            NotImplementedException notImplEx => (
                HttpStatusCode.BadRequest,
                "NOT_IMPLEMENTED",
                notImplEx.Message
            ),

            // Ошибки БД
            DbUpdateConcurrencyException => (
                HttpStatusCode.Conflict,
                "CONCURRENCY_CONFLICT",
                "Данные были изменены другим пользователем. Обновите страницу и попробуйте снова."
            ),
            
            DbUpdateException dbEx => MapDbUpdateException(dbEx),

            // Таймауты
            TaskCanceledException => (
                HttpStatusCode.RequestTimeout,
                "REQUEST_TIMEOUT",
                "Превышено время ожидания запроса"
            ),
            
            OperationCanceledException => (
                HttpStatusCode.RequestTimeout,
                "OPERATION_CANCELLED",
                "Операция была отменена"
            ),

            // Всё остальное → 500 Internal Server Error
            _ => (
                HttpStatusCode.InternalServerError,
                "UNKNOWN_EXCEPTION",
                "Внутренняя ошибка сервера"
            )
        };
    }

    /// <summary>
    /// Обработка исключений Entity Framework.
    /// </summary>
    private static (HttpStatusCode StatusCode, string ErrorCode, string Message) MapDbUpdateException(DbUpdateException ex)
    {
        // Проверяем PostgreSQL-специфичные ошибки через InnerException
        var innerMessage = ex.InnerException?.Message ?? ex.Message;

        // Unique constraint violation (PostgreSQL: 23505)
        if (innerMessage.Contains("23505") || 
            innerMessage.Contains("duplicate key", StringComparison.OrdinalIgnoreCase) ||
            innerMessage.Contains("unique constraint", StringComparison.OrdinalIgnoreCase))
        {
            return (
                HttpStatusCode.Conflict,
                "DUPLICATE_ENTRY",
                "Запись с такими данными уже существует"
            );
        }

        // Foreign key violation (PostgreSQL: 23503)
        if (innerMessage.Contains("23503") ||
            innerMessage.Contains("foreign key", StringComparison.OrdinalIgnoreCase) ||
            innerMessage.Contains("violates foreign key constraint", StringComparison.OrdinalIgnoreCase))
        {
            return (
                HttpStatusCode.BadRequest,
                "FOREIGN_KEY_VIOLATION",
                "Связанная запись не найдена или не может быть удалена"
            );
        }

        // Not null violation (PostgreSQL: 23502)
        if (innerMessage.Contains("23502") ||
            innerMessage.Contains("null value", StringComparison.OrdinalIgnoreCase))
        {
            return (
                HttpStatusCode.BadRequest,
                "NULL_VIOLATION",
                "Обязательное поле не заполнено"
            );
        }

        // Check constraint violation (PostgreSQL: 23514)
        if (innerMessage.Contains("23514") ||
            innerMessage.Contains("check constraint", StringComparison.OrdinalIgnoreCase))
        {
            return (
                HttpStatusCode.BadRequest,
                "CHECK_CONSTRAINT_VIOLATION",
                "Данные не соответствуют ограничениям"
            );
        }

        // Общая ошибка БД
        return (
            HttpStatusCode.InternalServerError,
            "DATABASE_ERROR",
            "Ошибка при сохранении данных"
        );
    }
}
