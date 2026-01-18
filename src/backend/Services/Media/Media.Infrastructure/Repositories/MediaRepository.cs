using Media.Application.Interfaces;
using Media.Domain;
using Media.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Media.Infrastructure.Repositories;

public sealed class MediaRepository(MediaDbContext db) : IMediaRepository
{
    public Task<MediaFile?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db.MediaFiles.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<MediaFile>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct)
    {
        var idList = ids.ToList();
        return db.MediaFiles
            .Where(x => idList.Contains(x.Id))
            .ToListAsync(ct);
    }   

    public Task<List<MediaFile>> GetByOwnerAsync(string ownerUserId, CancellationToken ct) =>
        db.MediaFiles
            .Where(x => x.OwnerUserId == ownerUserId)
            .OrderByDescending(x => x.UploadedAt)
            .ToListAsync(ct);

    public async Task AddAsync(MediaFile file, CancellationToken ct)
    {
        await db.MediaFiles.AddAsync(file, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(MediaFile file, CancellationToken ct)
    {
        db.MediaFiles.Remove(file);
        await db.SaveChangesAsync(ct);
    }
    
    public async Task DeleteManyAsync(IEnumerable<MediaFile> files, CancellationToken ct)
    {
        db.MediaFiles.RemoveRange(files);
        await db.SaveChangesAsync(ct);
    }
}