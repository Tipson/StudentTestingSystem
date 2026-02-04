using Assessment.Application.Interfaces;
using Assessment.Domain.Tests;
using Assessment.Domain.Tests.Enums;
using Assessment.Infrastructure.Data;
using Contracts.Assessment.Enums;
using Microsoft.EntityFrameworkCore;

namespace Assessment.Infrastructure.Repositories;

public sealed class TestRepository(AssessmentDbContext db) : ITestRepository
{
    public Task<Test?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db.Tests.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
    
    public Task<Test?> GetWithQuestionsAsync(Guid id, CancellationToken ct) =>
        db.Tests
            .AsNoTracking()
            .Include(t => t.Questions)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == id, ct);
    
    public Task<List<Test>> ListByOwnerAsync(string ownerId, CancellationToken ct) =>
        db.Tests
            .AsNoTracking()
            .Where(x => x.OwnerUserId == ownerId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
    
    public Task<List<Test>> ListPublishedAsync(CancellationToken ct) =>
        db.Tests
            .AsNoTracking()
            .Where(t => t.Status == TestStatus.Published)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);
    
    public Task<List<Test>> ListPublishedPublicAsync(CancellationToken ct) =>
        db.Tests
            .AsNoTracking()
            .Where(t => t.Status == TestStatus.Published && t.AccessType == TestAccessType.Public)
            .OrderByDescending(t => t.UpdatedAt)
            .ToListAsync(ct);

    public Task<List<Test>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct)
    {
        var idsList = ids.ToList();
    
        if (!idsList.Any())
            return Task.FromResult(new List<Test>());
    
        return db.Tests
            .AsNoTracking()
            .Where(t => idsList.Contains(t.Id))
            .ToListAsync(ct);
    }
    
    public Task AddAsync(Test test, CancellationToken ct)
    {
        return db.Tests.AddAsync(test, ct).AsTask();
    }

    public Task UpdateAsync(Test test, CancellationToken ct)
    {
        db.Tests.Update(test);
        // SaveChanges будет вызван в Handler
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Test test, CancellationToken ct)
    {
        db.Tests.Remove(test);
        // SaveChanges будет вызван в Handler
        return Task.CompletedTask;
    }
}
