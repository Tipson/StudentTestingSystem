using System.Net;
using BuildingBlocks.Api.Exceptions.Base;

namespace BuildingBlocks.Api.Exceptions;

/// <summary>401 Unauthorized.</summary>
public class UnauthorizedApiException : BadRequestApiException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.Unauthorized;
    public override string ErrorCode => "UNAUTHORIZED";

    public UnauthorizedApiException(string? message = "Unauthorized", Exception? innerException = null)
        : base(message, innerException)
    {
    }
}