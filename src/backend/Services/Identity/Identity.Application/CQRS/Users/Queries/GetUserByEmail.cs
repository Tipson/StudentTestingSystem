using BuildingBlocks.Api.Exceptions;
using Identity.Application.DTOs;
using Identity.Application.Interfaces;
using Mapster;
using MediatR;

namespace Identity.Application.CQRS.Users.Queries;

public sealed record GetUserByEmail(string Email) : IRequest<UserDto>;

public sealed class GetUserByEmailHandler(IUserRepository users)
    : IRequestHandler<GetUserByEmail, UserDto>
{
    public async Task<UserDto> Handle(GetUserByEmail request, CancellationToken ct)
    {
        var user = await users.GetByEmail(request.Email, ct)
                   ?? throw new EntityNotFoundException("Пользователь не найден.");

        return user.Adapt<UserDto>();
    }
}