namespace BuildingBlocks.Api.Options;

public sealed class KeycloakOptions
{
    public string Authority { get; set; } = null!;
    public bool RequireHttpsMetadata { get; set; } = true;
    public bool ValidateAudience { get; set; } = false;
    public string? Audience { get; set; }
}

