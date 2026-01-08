using Media.Domain;
using Microsoft.EntityFrameworkCore;

namespace Media.Infrastructure.Data;

public sealed class MediaDbContext(DbContextOptions<MediaDbContext> options) : DbContext(options)
{
    public DbSet<MediaFile> MediaFiles => Set<MediaFile>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<MediaFile>()
            .HasIndex(x => x.OwnerUserId);
    }
}