using System.Net;

namespace BuildingBlocks.Api.Exceptions.Base;

/// <summary>
/// Базовое исключение для API, содержащее статус HTTP и внутренний код ошибки.
/// </summary>
public class BaseApiException : Exception
{
    /// <summary>HTTP-статус ответа, связанный с исключением.</summary>
    public virtual HttpStatusCode StatusCode => HttpStatusCode.InternalServerError;

    /// <summary>Внутренний код ошибки для клиента.</summary>
    public virtual string ErrorCode => "BASE_API_EXCEPTION";

    public BaseApiException(string? message = null, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}