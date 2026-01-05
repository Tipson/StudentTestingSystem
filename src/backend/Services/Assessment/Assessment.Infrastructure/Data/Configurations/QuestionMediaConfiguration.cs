using Assessment.Domain.Questions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Assessment.Infrastructure.Data.Configurations;

public sealed class QuestionMediaConfiguration : IEntityTypeConfiguration<QuestionMedia>
{
    public void Configure(EntityTypeBuilder<QuestionMedia> builder)
    {
        builder.HasIndex(x => x.QuestionId);
    }
}