using System.Net;

namespace BuildingBlocks.Api.Exceptions.Base;

/// <summary>400 Bad Request.</summary>
public class BadRequestApiException : BaseApiException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.BadRequest;
    public override string ErrorCode => "BAD_REQUEST";

    public BadRequestApiException(string? message = "Bad request", Exception? innerException = null)
        : base(message, innerException)
    {
    }
}