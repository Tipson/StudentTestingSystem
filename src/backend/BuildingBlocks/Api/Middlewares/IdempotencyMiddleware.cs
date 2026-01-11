using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Distributed;

namespace BuildingBlocks.Api.Middlewares;

public class IdempotencyMiddleware(RequestDelegate next, IDistributedCache cache)
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(24);

    public async Task InvokeAsync(HttpContext context)
    {
        // Проверяем только POST/PUT/PATCH
        if (!IsIdempotentMethod(context.Request.Method))
        {
            await next(context);
            return;
        }

        // Получаем idempotency key из заголовка
        if (!context.Request.Headers.TryGetValue("Idempotency-Key", out var idempotencyKey) ||
            string.IsNullOrWhiteSpace(idempotencyKey))
        {
            await next(context);
            return;
        }

        var cacheKey = $"idempotency:{idempotencyKey}";

        // Проверяем кэш
        var cachedResponse = await cache.GetStringAsync(cacheKey, context.RequestAborted);
        if (cachedResponse is not null)
        {
            var cached = JsonSerializer.Deserialize<CachedResponse>(cachedResponse);
            context.Response.StatusCode = cached!.StatusCode;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(cached.Body, context.RequestAborted);
            return;
        }

        // Перехватываем response
        var originalBodyStream = context.Response.Body;
        using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        await next(context);

        // Сохраняем только успешные ответы (2xx)
        if (context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)
        {
            responseBody.Seek(0, SeekOrigin.Begin);
            var body = await new StreamReader(responseBody).ReadToEndAsync();

            var response = new CachedResponse(context.Response.StatusCode, body);
            var serialized = JsonSerializer.Serialize(response);

            await cache.SetStringAsync(cacheKey, serialized, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = CacheDuration
            }, context.RequestAborted);
        }

        // Копируем response обратно
        responseBody.Seek(0, SeekOrigin.Begin);
        await responseBody.CopyToAsync(originalBodyStream, context.RequestAborted);
        context.Response.Body = originalBodyStream;
    }

    private static bool IsIdempotentMethod(string method) =>
        method is "POST" or "PUT" or "PATCH";

    private record CachedResponse(int StatusCode, string Body);
}