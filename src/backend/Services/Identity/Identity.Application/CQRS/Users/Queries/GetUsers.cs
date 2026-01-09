using Identity.Application.DTOs;
using Identity.Application.Interfaces;
using Mapster;
using MediatR;

namespace Identity.Application.CQRS.Users.Queries;

public sealed record GetUsers : IRequest<IList<UserDto>>;

public sealed class GetUsersHandler(IUserRepository users)
    : IRequestHandler<GetUsers, IList<UserDto>>
{
    public async Task<IList<UserDto>> Handle(GetUsers request, CancellationToken ct)
    {
        var list = await users.GetListAsync(ct);
        return list.Adapt<IList<UserDto>>();
    }
}