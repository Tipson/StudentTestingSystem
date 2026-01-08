using Assessment.Application.Interfaces;
using Assessment.Domain.Questions;
using Assessment.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Assessment.Infrastructure.Repositories;

public sealed class QuestionRepository(AssessmentDbContext db) : IQuestionRepository
{
    public Task<Question?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db.Questions
            .Include(q => q.Options)
                .ThenInclude(o => o.Media)
            .Include(q => q.Media)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<Question>> ListByTestIdAsync(Guid testId, CancellationToken ct) =>
        db.Questions
            .Include(q => q.Options)
                .ThenInclude(o => o.Media)
            .Include(q => q.Media)
            .Where(x => x.TestId == testId)
            .OrderBy(x => x.Order)
            .ToListAsync(ct);

    public async Task<int> GetNextOrderAsync(Guid testId, CancellationToken ct)
    {
        var max = await db.Questions
            .Where(x => x.TestId == testId)
            .MaxAsync(x => (int?)x.Order, ct);

        return (max ?? 0) + 1;
    }

    public async Task AddAsync(Question question, CancellationToken ct)
    {
        await db.Questions.AddAsync(question, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Question question, CancellationToken ct)
    {
        // Удаляем старые медиа записи
        var existingMedia = await db.QuestionMedia
            .Where(m => m.QuestionId == question.Id)
            .ToListAsync(ct);
        db.QuestionMedia.RemoveRange(existingMedia);

        // Удаляем старые медиа записи вариантов
        var optionIds = question.Options.Select(o => o.Id).ToList();
        var existingOptionMedia = await db.QuestionOptionMedia
            .Where(m => optionIds.Contains(m.QuestionOptionId))
            .ToListAsync(ct);
        db.QuestionOptionMedia.RemoveRange(existingOptionMedia);

        db.Questions.Update(question);
        await db.SaveChangesAsync(ct);
    }

    public async Task UpdateRangeAsync(IEnumerable<Question> questions, CancellationToken ct)
    {
        var strategy = db.Database.CreateExecutionStrategy();

        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);

            db.Questions.UpdateRange(questions);
            await db.SaveChangesAsync(ct);

            await transaction.CommitAsync(ct);
        });
    }

    public async Task DeleteAsync(Question question, CancellationToken ct)
    {
        db.Questions.Remove(question);
        await db.SaveChangesAsync(ct);
    }
}