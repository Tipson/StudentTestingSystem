using Assessment.Domain.Questions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Assessment.Infrastructure.Data.Configurations;

public sealed class QuestionOptionConfiguration : IEntityTypeConfiguration<QuestionOption>
{
    public void Configure(EntityTypeBuilder<QuestionOption> builder)
    {
        // Индекс для производительности (уникальность через DEFERRABLE constraint)
        builder.HasIndex(x => x.QuestionId);

        // Связь QuestionOption -> Media
        builder.HasMany(x => x.Media)
            .WithOne()
            .HasForeignKey(m => m.QuestionOptionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}