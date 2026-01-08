using Assessment.Domain.Questions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Assessment.Infrastructure.Data.Configurations;

public sealed class QuestionOptionMediaConfiguration : IEntityTypeConfiguration<QuestionOptionMedia>
{
    public void Configure(EntityTypeBuilder<QuestionOptionMedia> builder)
    {
        builder.HasIndex(x => x.QuestionOptionId);
    }
}