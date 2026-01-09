using System.Net.Http.Json;
using Identity.Application.Interfaces;

namespace Identity.Infrastructure.Keycloak;

public sealed class KeycloakUserService(HttpClient httpClient) : IKeycloakUserService
{
    public async Task SetUserGroupAsync(string userId, Guid groupId, CancellationToken ct = default)
    {
        var payload = new
        {
            attributes = new Dictionary<string, string[]>
            {
                ["groupId"] = [groupId.ToString()]
            }
        };

        using var response = await httpClient.PutAsJsonAsync($"users/{userId}", payload, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task RemoveUserGroupAsync(string userId, CancellationToken ct = default)
    {
        var payload = new
        {
            attributes = new Dictionary<string, string[]>
            {
                ["groupId"] = []
            }
        };

        using var response = await httpClient.PutAsJsonAsync($"users/{userId}", payload, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task<Guid?> GetUserGroupAsync(string userId, CancellationToken ct = default)
    {
        using var response = await httpClient.GetAsync($"users/{userId}", ct);
        if (!response.IsSuccessStatusCode)
            return null;

        var user = await response.Content.ReadFromJsonAsync<KeycloakUser>(cancellationToken: ct);
        if (user?.Attributes?.TryGetValue("groupId", out var values) == true
            && values.Length > 0
            && Guid.TryParse(values[0], out var groupId))
        {
            return groupId;
        }

        return null;
    }

    private sealed class KeycloakUser
    {
        public Dictionary<string, string[]>? Attributes { get; set; }
    }
}
