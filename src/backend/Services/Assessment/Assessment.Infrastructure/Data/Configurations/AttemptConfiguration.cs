using Assessment.Domain.Attempts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Assessment.Infrastructure.Data.Configurations;

public class AttemptConfiguration : IEntityTypeConfiguration<Attempt>
{
    public void Configure(EntityTypeBuilder<Attempt> builder)
    {
        // Индекс для поиска попыток по тесту
        builder.HasIndex(x => x.TestId);
        
        // Индекс для поиска попыток пользователя
        builder.HasIndex(x => x.UserId);

        // Связь Attempt -> Answers
        builder.HasMany(x => x.Answers)
            .WithOne()
            .HasForeignKey(a => a.AttemptId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}