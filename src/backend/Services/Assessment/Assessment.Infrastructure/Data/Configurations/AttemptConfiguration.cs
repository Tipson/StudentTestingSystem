using Assessment.Domain.Attempts;
using Assessment.Domain.Tests;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Assessment.Infrastructure.Data.Configurations;

public class AttemptConfiguration : IEntityTypeConfiguration<Attempt>
{
    public void Configure(EntityTypeBuilder<Attempt> builder)
    {
        // Связь с тестом (каскадное удаление при удалении теста)
        builder.HasOne<Test>()
            .WithMany()
            .HasForeignKey(a => a.TestId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}