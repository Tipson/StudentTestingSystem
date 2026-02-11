using Assessment.Application.Interfaces;
using Assessment.Domain.Attempts;
using Assessment.Infrastructure.Data;
using Contracts.Assessment.Enums;
using Microsoft.EntityFrameworkCore;

namespace Assessment.Infrastructure.Repositories;

public class AttemptRepository(AssessmentDbContext db) : IAttemptRepository
{
    public Task<Attempt?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db.Attempts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);


    public Task<Attempt?> GetWithAnswersAsync(Guid id, CancellationToken ct) =>
        db.Attempts
            .AsNoTracking()
            .Include(a => a.Answers)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<int> CountByUserAndTestAsync(string userId, Guid testId, CancellationToken ct) =>
        db.Attempts.CountAsync(x => x.UserId == userId && x.TestId == testId, ct);

    public Task<Attempt?> GetActiveAsync(string userId, Guid testId, CancellationToken ct) =>
        db.Attempts
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.UserId == userId &&
                x.TestId == testId &&
                x.Status == AttemptStatus.InProgress, ct);


    public Task<List<Attempt>> ListByUserAndTestAsync(string userId, Guid testId, CancellationToken ct) =>
        db.Attempts
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.TestId == testId)
            .OrderByDescending(x => x.StartedAt)
            .ToListAsync(ct);
    

    public Task<List<Attempt>> ListByUserAsync(string userId, CancellationToken ct) => 
        db.Attempts
            .AsNoTracking()
            .Where(x => x.UserId == userId )
            .OrderByDescending(x => x.StartedAt)
            .ToListAsync(ct);

    public Task<List<Attempt>> ListByTestAsync(Guid testId, CancellationToken ct) =>
        db.Attempts
            .AsNoTracking()
            .Where(x => x.TestId == testId)
            .OrderByDescending(x => x.StartedAt)    
            .ToListAsync(ct);

    public Task AddAsync(Attempt attempt, CancellationToken ct)
    {
        return db.Attempts.AddAsync(attempt, ct).AsTask();
    }

    public Task UpdateAsync(Attempt attempt, CancellationToken ct)
    {
        db.Attempts.Update(attempt);
        return Task.CompletedTask;
    }
}
