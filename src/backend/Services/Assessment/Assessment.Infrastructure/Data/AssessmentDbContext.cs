using Assessment.Domain.AI;
using Assessment.Domain.Attempts;
using Assessment.Domain.Questions;
using Assessment.Domain.Tests;
using Microsoft.EntityFrameworkCore;

namespace Assessment.Infrastructure.Data;

public sealed class AssessmentDbContext(DbContextOptions<AssessmentDbContext> options) : DbContext(options)
{
    public DbSet<Test> Tests => Set<Test>();

    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuestionMedia> QuestionMedia => Set<QuestionMedia>();

    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
    public DbSet<QuestionOptionMedia> QuestionOptionMedia => Set<QuestionOptionMedia>();

    public DbSet<Attempt> Attempts => Set<Attempt>();
    public DbSet<AttemptAnswer> AttemptAnswers => Set<AttemptAnswer>();
    public DbSet<TestAccess> TestAccesses => Set<TestAccess>();

    public DbSet<HintUsage> HintUsages => Set<HintUsage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AssessmentDbContext).Assembly);
    }
}