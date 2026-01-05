using Assessment.Domain.Attempts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Assessment.Infrastructure.Data.Configurations;

public sealed class AttemptAnswerConfiguration : IEntityTypeConfiguration<AttemptAnswer>
{
    public void Configure(EntityTypeBuilder<AttemptAnswer> builder)
    {
        // Уникальность: один ответ на вопрос в рамках попытки
        builder.HasIndex(x => new { x.AttemptId, x.QuestionId })
            .IsUnique();

        // JSON колонка для ответа
        builder.Property(x => x.Answer)
            .HasColumnType("jsonb")
            .IsRequired();
    }
}