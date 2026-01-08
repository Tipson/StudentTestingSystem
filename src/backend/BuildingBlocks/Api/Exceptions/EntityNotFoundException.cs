using System.Net;
using BuildingBlocks.Api.Exceptions.Base;

namespace BuildingBlocks.Api.Exceptions;

/// <summary>404 Not Found.</summary>
public class EntityNotFoundException : BadRequestApiException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.NotFound;
    public override string ErrorCode => "ENTITY_NOT_FOUND";

    public EntityNotFoundException(string? message = "Entity not found", Exception? innerException = null)
        : base(message, innerException)
    {
    }
}