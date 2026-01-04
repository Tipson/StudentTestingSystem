using Assessment.Domain.Attempts;
using Assessment.Domain.Questions;
using Assessment.Domain.Tests;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Assessment.Infrastructure.Data.Configurations;

public class TestConfiguration : IEntityTypeConfiguration<Test>
{
    public void Configure(EntityTypeBuilder<Test> builder)
    {
        // Каскадное удаление вопросов
        builder.HasMany<Question>()
            .WithOne()
            .HasForeignKey(q => q.TestId)
            .OnDelete(DeleteBehavior.Cascade);
            
        // Каскадное удаление попыток
        builder.HasMany<Attempt>()
            .WithOne()
            .HasForeignKey(a => a.TestId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}