using Mapster;
using Media.Application.DTOs;
using Media.Application.Helpers;
using Media.Domain;

namespace Media.Application.Mapping;

public sealed class MediaFileMapsterConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<MediaFile, MediaFileDto>()
            .ConstructUsing(src => new MediaFileDto(
                src.Id,
                src.FileName,
                src.ContentType,
                src.SizeBytes,
                src.OwnerUserId,
                src.UploadedAt,
                null,
                MediaTypeHelper.GetMediaType(src.ContentType)
            ));
    }
}