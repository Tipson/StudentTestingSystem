using System.Net;
using BuildingBlocks.Api.Exceptions.Base;

namespace BuildingBlocks.Api.Exceptions;

/// <summary>403 Forbidden.</summary>
public class ForbiddenException : BadRequestApiException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.Forbidden;
    public override string ErrorCode => "FORBIDDEN";

    public ForbiddenException(string? message = "Forbidden", Exception? innerException = null)
        : base(message, innerException)
    {
    }
}