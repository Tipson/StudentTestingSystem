using Identity.Application.DTOs;
using Identity.Application.Interfaces;
using Mapster;
using MediatR;

namespace Identity.Application.Users.Queries;

public sealed record SearchUsers(string Query) : IRequest<IList<UserDto>>;

public sealed class SearchUsersHandler(IUserRepository users)
    : IRequestHandler<SearchUsers, IList<UserDto>>
{
    public async Task<IList<UserDto>> Handle(SearchUsers request, CancellationToken ct)
    {
        var list = await users.SearchAsync(request.Query, ct);
        return list.Adapt<IList<UserDto>>();
    }
}

