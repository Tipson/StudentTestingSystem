using System.Net.Http.Json;
using Identity.Application.Interfaces;
using Microsoft.Extensions.Options;

namespace Identity.Application.Services;

public sealed class KeycloakUserService(
    IHttpClientFactory httpClientFactory,
    IOptions<KeycloakSettings> settings)
    : IKeycloakUserService
{
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient("Keycloak");
    private readonly KeycloakSettings _settings = settings.Value;

    public async Task SetUserGroupAsync(string userId, Guid groupId, CancellationToken ct = default)
    {
        var url = $"{_settings.AdminUrl}/users/{userId}";
        
        var payload = new
        {
            attributes = new Dictionary<string, string[]>
            {
                ["groupId"] = new[] { groupId.ToString() }
            }
        };

        var response = await _httpClient.PutAsJsonAsync(url, payload, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task RemoveUserGroupAsync(string userId, CancellationToken ct = default)
    {
        var url = $"{_settings.AdminUrl}/users/{userId}";
        
        var payload = new
        {
            attributes = new Dictionary<string, string[]>
            {
                ["groupId"] = Array.Empty<string>()
            }
        };

        var response = await _httpClient.PutAsJsonAsync(url, payload, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task<Guid?> GetUserGroupAsync(string userId, CancellationToken ct = default)
    {
        var url = $"{_settings.AdminUrl}/users/{userId}";
        var response = await _httpClient.GetAsync(url, ct);
        
        if (!response.IsSuccessStatusCode)
            return null;

        var user = await response.Content.ReadFromJsonAsync<KeycloakUser>(ct);
        
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

public sealed class KeycloakSettings
{
    public string AdminUrl { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
}