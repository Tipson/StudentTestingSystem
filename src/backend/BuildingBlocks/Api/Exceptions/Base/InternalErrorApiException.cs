using System.Net;

namespace BuildingBlocks.Api.Exceptions.Base;

/// <summary>500 Internal Server Error.</summary>
public sealed class InternalErrorApiException : BaseApiException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.InternalServerError;
    public override string ErrorCode => "INTERNAL_SERVER_EXCEPTION";

    public InternalErrorApiException(string? message = "Internal server error", Exception? innerException = null)
        : base(message, innerException)
    {
    }
}