using Microsoft.Extensions.Hosting;

namespace BuildingBlocks.Api.Extensions;

public static class HostEnvironmentExtensions
{
    public static bool IsCompose(this IHostEnvironment env) =>
        env.IsEnvironment("Compose");
}