using Identity.Application.DTOs;
using Identity.Domain.Groups;
using Identity.Domain.Users;
using Mapster;

namespace Identity.Application.CQRS.Groups.Mapping;

public sealed class GroupMapsterConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Group, GroupDto>();
        
        config.NewConfig<List<Group>, GroupListDto>()
            .Map(d => d.Items, s => s);
        
        config.NewConfig<User, GroupMemberDto>()
            .Map(d => d.UserId, s => s.Id)
            .Map(d => d.Email, s => s.Email)
            .Map(d => d.FullName, s => s.FullName);
    }
}