using Assessment.Application.Interfaces;
using Assessment.Domain.Attempts;
using Assessment.Infrastructure.Data;
using Contracts.Assessment.Enums;
using Microsoft.EntityFrameworkCore;

namespace Assessment.Infrastructure.Repositories;

public class AttemptRepository(AssessmentDbContext db) : IAttemptRepository
{
    public Task<Attempt?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db.Attempts.FirstOrDefaultAsync(x => x.Id == id, ct);


    public Task<Attempt?> GetWithAnswersAsync(Guid id, CancellationToken ct) =>
        db.Attempts
            .Include(a => a.Answers)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<int> CountByUserAndTestAsync(string userId, Guid testId, CancellationToken ct) =>
        db.Attempts.CountAsync(x => x.UserId == userId && x.TestId == testId, ct);

    public Task<Attempt?> GetActiveAsync(string userId, Guid testId, CancellationToken ct) =>
        db.Attempts
            .FirstOrDefaultAsync(x =>
                x.UserId == userId &&
                x.TestId == testId &&
                x.Status == AttemptStatus.InProgress, ct);


    public Task<List<Attempt>> ListByUserAndTestAsync(string userId, Guid testId, CancellationToken ct) =>
        db.Attempts
            .Where(x => x.UserId == userId && x.TestId == testId)
            .OrderByDescending(x => x.StartedAt)
            .ToListAsync(ct);
    

    public Task<List<Attempt>> ListByUserAsync(string userId, CancellationToken ct) => 
        db.Attempts
            .Where(x => x.UserId == userId )
            .OrderByDescending(x => x.StartedAt)
            .ToListAsync(ct);

    public Task<List<Attempt>> ListByTestAsync(Guid testId, CancellationToken ct) =>
        db.Attempts
            .Where(x => x.TestId == testId)
            .OrderByDescending(x => x.StartedAt)    
            .ToListAsync(ct);

    public async Task AddAsync(Attempt attempt, CancellationToken ct)
    {
        await db.Attempts.AddAsync(attempt, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Attempt attempt, CancellationToken ct)
    {
        db.Attempts.Update(attempt);
        await db.SaveChangesAsync(ct);
    }
}