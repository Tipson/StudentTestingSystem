using Assessment.Domain.Tests;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Assessment.Infrastructure.Data.Configurations;

public class TestAccessConfiguration : IEntityTypeConfiguration<TestAccess>
{
    public void Configure(EntityTypeBuilder<TestAccess> builder)
    {
        builder.HasKey(e => e.Id);
        
        builder.HasOne(e => e.Test)
            .WithMany()
            .HasForeignKey(e => e.TestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(e => e.GrantType)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Индексы для быстрого поиска
        builder.HasIndex(e => e.TestId);
        builder.HasIndex(e => e.UserId);
        builder.HasIndex(e => e.GroupId);
        builder.HasIndex(e => e.InviteCode).IsUnique();
        
        // Уникальность: один пользователь не может иметь два доступа к одному тесту
        builder.HasIndex(e => new { e.TestId, e.UserId })
            .IsUnique()
            .HasFilter("\"UserId\" IS NOT NULL");
        
        // Уникальность: одна группа не может иметь два доступа к одному тесту
        builder.HasIndex(e => new { e.TestId, e.GroupId })
            .IsUnique()
            .HasFilter("\"GroupId\" IS NOT NULL");    }
}