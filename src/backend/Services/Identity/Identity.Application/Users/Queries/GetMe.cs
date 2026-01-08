using Application;
using BuildingBlocks.Api.Exceptions;
using Identity.Application.DTOs;
using Identity.Application.Interfaces;
using Mapster;
using MediatR;

namespace Identity.Application.Users.Queries;

public sealed record GetMe : IRequest<UserDto>;

public sealed class GetMeHandler(
    IUserContext userContext,
    IUserRepository users
) : IRequestHandler<GetMe, UserDto>
{
    public async Task<UserDto> Handle(GetMe request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var user = await users.GetById(userId, ct)
                   ?? throw new EntityNotFoundException("Пользователь не найден.");

        return user.Adapt<UserDto>();
    }
}