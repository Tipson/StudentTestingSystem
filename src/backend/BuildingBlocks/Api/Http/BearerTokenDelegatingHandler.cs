using Application;

namespace BuildingBlocks.Api.Http;

/// <summary>
/// Добавляет Bearer-токен из UserContext в исходящие запросы к внутренним микросервисам.
/// Регистрировать через AddHttpMessageHandler&lt;BearerTokenDelegatingHandler&gt;() при настройке HttpClient.
/// </summary>
public sealed class BearerTokenDelegatingHandler : DelegatingHandler
{
    private readonly IUserContext _userContext;

    public BearerTokenDelegatingHandler(IUserContext userContext)
    {
        _userContext = userContext;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var token = _userContext.BearerToken;
        if (string.IsNullOrWhiteSpace(token))
            throw new InvalidOperationException(
                "Bearer-токен отсутствует. Вызов внутреннего сервиса возможен только в контексте аутентифицированного запроса.");

        request.Headers.TryAddWithoutValidation("Authorization", token);
        return await base.SendAsync(request, cancellationToken);
    }
}
