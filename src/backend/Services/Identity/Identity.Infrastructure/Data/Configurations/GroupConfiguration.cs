using Identity.Domain.Groups;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identity.Infrastructure.Data.Configurations;

public sealed class GroupConfiguration : IEntityTypeConfiguration<Group>
{
    public void Configure(EntityTypeBuilder<Group> b)
    {
        // Уникальность: одна группа на один набор
        // Позволяет существовать "РВ-3-1 2023" и "РВ-3-1 2024"
        b.HasIndex(x => new { x.Institution, x.Specialization, x.AdmissionYear, x.GroupNumber })
            .IsUnique();

        // Индекс под список/фильтры активных групп
        b.HasIndex(x => new { x.IsActive, x.Institution, x.Specialization, x.Course, x.GroupNumber });

        b.HasIndex(x => x.Code);
    }
}