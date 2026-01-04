using Identity.Application.DTOs;
using Identity.Domain.Users;
using Mapster;

namespace Identity.Application.Users.Mapping;

public class UserMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<User, UserDto>();
    }
}