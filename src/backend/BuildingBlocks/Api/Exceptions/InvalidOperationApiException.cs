using System.Net;
using BuildingBlocks.Api.Exceptions.Base;

namespace BuildingBlocks.Api.Exceptions;

/// <summary>
/// 400 Bad Request — недопустимая операция в текущем состоянии.
/// Используется для InvalidOperationException из domain-логики.
/// </summary>
public class InvalidOperationApiException : BadRequestApiException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.BadRequest;
    public override string ErrorCode => "INVALID_OPERATION";

    public InvalidOperationApiException(string? message = "Операция недопустима", Exception? innerException = null)
        : base(message, innerException)
    {
    }
}
