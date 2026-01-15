using System.Net;
using BuildingBlocks.Api.Exceptions.Base;

namespace BuildingBlocks.Api.Exceptions;

/// <summary>
/// 400 Bad Request — ошибка валидации входных данных.
/// Используется для ArgumentException, ArgumentNullException, ArgumentOutOfRangeException.
/// </summary>
public class ValidationException : BadRequestApiException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.BadRequest;
    public override string ErrorCode => "VALIDATION_ERROR";

    public ValidationException(string? message = "Ошибка валидации", Exception? innerException = null)
        : base(message, innerException)
    {
    }
}
