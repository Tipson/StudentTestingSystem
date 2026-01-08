using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;

namespace Identity.Api.Security;

public sealed class RealmRolesClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not ClaimsIdentity identity || !identity.IsAuthenticated)
            return Task.FromResult(principal);

        // Если роли уже есть, всё равно добавим недостающие из realm_access.roles
        var existing = new HashSet<string>(identity.FindAll(ClaimTypes.Role).Select(c => c.Value), StringComparer.OrdinalIgnoreCase);
        var realmAccess = identity.FindFirst("realm_access")?.Value;
        if (!string.IsNullOrWhiteSpace(realmAccess))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(realmAccess);
                if (doc.RootElement.TryGetProperty("roles", out var rolesEl)
                    && rolesEl.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var r in rolesEl.EnumerateArray())
                    {
                        var role = r.GetString();
                        if (string.IsNullOrWhiteSpace(role)) continue;
                        if (existing.Add(role))
                        {
                            identity.AddClaim(new Claim(ClaimTypes.Role, role));
                        }
                    }
                }
            }
            catch
            {
                // Игнорируем ошибки парсинга
            }
        }

        return Task.FromResult(principal);
    }
}

