using Contracts.Identity;
using Identity.Application.DTOs;
using Identity.Application.Interfaces;
using Identity.Domain.Users;
using Mapster;
using MediatR;

namespace Identity.Application.Users.Queries;

public sealed record GetUsersByRole(UserRole Role) : IRequest<IList<UserDto>>;

public sealed class GetUsersByRoleHandler(IUserRepository users)
    : IRequestHandler<GetUsersByRole, IList<UserDto>>
{
    public async Task<IList<UserDto>> Handle(GetUsersByRole request, CancellationToken ct)
    {
        var list = await users.GetByRoleAsync(request.Role, ct);
        return list.Adapt<IList<UserDto>>();
    }
}

