using Assessment.Domain.Attempts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Assessment.Infrastructure.Data.Configurations;

public class AttemptConfiguration : IEntityTypeConfiguration<Attempt>
{
    public void Configure(EntityTypeBuilder<Attempt> builder)
    {
        // Индексы для производительности
        
        // GetActiveAsync + ListByUserAndTestAsync: WHERE UserId = X AND TestId = Y (AND Status = InProgress)
        builder.HasIndex(x => new { x.UserId, x.TestId, x.Status });
        
        // Уникальность: один активный attempt на пользователя+тест
        builder.HasIndex(a => new { a.UserId, a.TestId, a.Status })
            .HasFilter("\"Status\" = 0") // 0 = InProgress
            .IsUnique();
        
        // ListByUserAsync: WHERE UserId = X ORDER BY StartedAt DESC
        builder.HasIndex(x => new { x.UserId, x.StartedAt });
        
        // ListByTestAsync: WHERE TestId = X ORDER BY StartedAt DESC
        builder.HasIndex(x => new { x.TestId, x.StartedAt });

        // Связь Attempt -> Answers
        builder.HasMany(x => x.Answers)
            .WithOne()
            .HasForeignKey(a => a.AttemptId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}