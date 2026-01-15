using System.Net;
using BuildingBlocks.Api.Exceptions.Base;

namespace BuildingBlocks.Api.Exceptions;

/// <summary>
/// 409 Conflict — конфликт данных (например, дублирование уникального значения).
/// </summary>
public class ConflictException : BaseApiException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.Conflict;
    public override string ErrorCode => "CONFLICT";

    public ConflictException(string? message = "Конфликт данных", Exception? innerException = null)
        : base(message, innerException)
    {
    }
}
