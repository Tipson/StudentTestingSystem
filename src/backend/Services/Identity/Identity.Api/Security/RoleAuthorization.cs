using Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using UserRole = Contracts.Identity.UserRole;

namespace Identity.Api.Security;

public sealed class RoleRequirement(UserRole requiredRole) : IAuthorizationRequirement
{
    public UserRole RequiredRole { get; } = requiredRole;
}

public sealed class RoleAuthorizationHandler(IUserContext userContext)
    : AuthorizationHandler<RoleRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        RoleRequirement requirement)
    {
        if (userContext.Role == requirement.RequiredRole)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

