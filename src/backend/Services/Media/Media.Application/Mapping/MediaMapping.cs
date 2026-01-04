using Mapster;
using Media.Application.DTOs;
using Media.Domain;

namespace Media.Application.Mapping;

public sealed class MediaMapping : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<MediaFile, MediaFileDto>()
            .Map(dest => dest.DownloadUrl, src => $"/api/media/{src.Id}/download");
    }
}