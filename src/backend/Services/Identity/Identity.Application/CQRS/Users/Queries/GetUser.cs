using BuildingBlocks.Api.Exceptions;
using Identity.Application.DTOs;
using Identity.Application.Interfaces;
using Mapster;
using MediatR;

namespace Identity.Application.CQRS.Users.Queries;

public sealed record GetUser(string UserId) : IRequest<UserDto>;

public sealed class GetUserHandler(IUserRepository users)
    : IRequestHandler<GetUser, UserDto>
{
    public async Task<UserDto> Handle(GetUser request, CancellationToken ct)
    {
        var user = await users.GetById(request.UserId, ct) ?? throw new EntityNotFoundException("Пользователь не найден.");
        return user.Adapt<UserDto>();
    }
}
