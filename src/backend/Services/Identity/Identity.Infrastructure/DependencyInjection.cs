using Identity.Application.Interfaces;
using Identity.Domain;
using Identity.Infrastructure.Common;
using Identity.Infrastructure.Data;
using Identity.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Identity.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityInfrastructure(this IServiceCollection services, IConfiguration cfg)
    {
        var cs = cfg.GetConnectionString("IdentityDb") ?? cfg["DB_CONNECTION"];
        if (string.IsNullOrWhiteSpace(cs))
            throw new Exception("Строка подключения к БД Identity не задана.");

        services.AddDbContext<IdentityDbContext>(o => o.UseNpgsql(cs));

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IGroupRepository, GroupRepository>();

        return services;
    }
}

