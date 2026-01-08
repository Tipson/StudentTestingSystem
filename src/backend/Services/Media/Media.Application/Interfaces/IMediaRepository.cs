using Media.Domain;

namespace Media.Application.Interfaces;

public interface IMediaRepository
{
    Task<MediaFile?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<List<MediaFile>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct);
    Task<List<MediaFile>> GetByOwnerAsync(string ownerUserId, CancellationToken ct);
    Task AddAsync(MediaFile file, CancellationToken ct);
    Task DeleteAsync(MediaFile file, CancellationToken ct);
}