using BuildingBlocks.Api.Exceptions;
using Contracts.Identity;
using Identity.Application.Interfaces;
using Keycloak.AuthServices.Sdk.Kiota;
using Keycloak.AuthServices.Sdk.Kiota.Admin;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Identity.Infrastructure.Keycloak;

public sealed class KeycloakService(
    KeycloakAdminApiClient kc,
    IOptions<KeycloakAdminClientOptions> options,
    ILogger<KeycloakService> logger
) : IKeycloakService
{
    private readonly string _realm = options.Value.Realm;
    private static readonly string[] ManagedRoles = ["admin", "teacher", "student"];

    public async Task SetUserRealmRoleAsync(string userId, UserRole role, CancellationToken ct)
    {
        logger.LogInformation(
            "Установка роли {Role} для пользователя {UserId} в Keycloak",
            role, userId);

        var realmRoles = await kc.Admin.Realms[_realm].Roles.GetAsync(cancellationToken: ct)
                         ?? throw new InvalidOperationException("Keycloak: не удалось загрузить роли realm");

        var toDelete = realmRoles
            .Where(r => r.Name is not null && ManagedRoles.Contains(r.Name, StringComparer.OrdinalIgnoreCase))
            .ToList();

        if (toDelete.Count > 0)
        {
            logger.LogDebug(
                "Удаление существующих ролей пользователя {UserId}: {Roles}",
                userId, string.Join(", ", toDelete.Select(r => r.Name)));

            await kc.Admin.Realms[_realm]
                .Users[userId]
                .RoleMappings
                .Realm
                .DeleteAsync(toDelete, cancellationToken: ct);
        }

        var roleName = role switch
        {
            UserRole.Admin => "admin",
            UserRole.Teacher => "teacher",
            _ => "student"
        };

        var toAdd = realmRoles
            .Where(r => string.Equals(r.Name, roleName, StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (toAdd.Count == 0)
        {
            logger.LogError(
                "Роль {RoleName} не найдена в Keycloak realm {Realm}",
                roleName, _realm);
            throw new EntityNotFoundException($"Keycloak: роль realm '{roleName}' не найдена");
        }

        await kc.Admin.Realms[_realm]
            .Users[userId]
            .RoleMappings
            .Realm
            .PostAsync(toAdd, cancellationToken: ct);

        logger.LogInformation(
            "Роль {Role} успешно установлена для пользователя {UserId}",
            role, userId);
    }
}
