using Assessment.Domain.Tests;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Assessment.Infrastructure.Data.Configurations;

public class TestConfiguration : IEntityTypeConfiguration<Test>
{
    public void Configure(EntityTypeBuilder<Test> builder)
    {
        builder.HasMany(x => x.Questions)
            .WithOne()
            .HasForeignKey(q => q.TestId)
            .OnDelete(DeleteBehavior.Cascade);
        
        // ListByOwnerAsync: WHERE OwnerUserId = X ORDER BY CreatedAt DESC
        builder.HasIndex(x => new { x.OwnerUserId, x.CreatedAt });
        
        // ListPublishedAsync: WHERE Status = Published ORDER BY CreatedAt DESC  
        builder.HasIndex(x => new { x.Status, x.CreatedAt });
        
        // ListPublishedPublicAsync: WHERE Status = Published AND AccessType = Public ORDER BY UpdatedAt DESC
        builder.HasIndex(x => new { x.Status, x.AccessType, x.UpdatedAt });
    }
}