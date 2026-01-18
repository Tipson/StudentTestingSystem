using System.Net;
using BuildingBlocks.Api.Exceptions.Base;

namespace BuildingBlocks.Api.Exceptions;

/// <summary>
/// 400 Bad Request — операция не поддерживается.
/// Используется для NotSupportedException, NotImplementedException.
/// </summary>
public class NotSupportedApiException : BadRequestApiException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.BadRequest;
    public override string ErrorCode => "NOT_SUPPORTED";

    public NotSupportedApiException(string? message = "Операция не поддерживается", Exception? innerException = null)
        : base(message, innerException)
    {
    }
}
