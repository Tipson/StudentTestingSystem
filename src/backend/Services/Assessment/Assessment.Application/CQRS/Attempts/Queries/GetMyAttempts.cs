using Application;
using Assessment.Application.DTOs.Attempt;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Attempts.Queries;

/// <summary>
/// Получить список всех попыток текущего пользователя.
/// </summary>
public sealed record GetMyAttempts : IRequest<List<AttemptDto>>;

public sealed class GetMyAttemptsHandler(IUserContext userContext, IAttemptRepository attempts) : IRequestHandler<GetMyAttempts, List<AttemptDto>>
{
    public async Task<List<AttemptDto>> Handle(GetMyAttempts request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");
        
        var list = await attempts.ListByUserAsync(userId, ct);
        
        return list.Select(a => a.Adapt<AttemptDto>()).ToList();
    }
}