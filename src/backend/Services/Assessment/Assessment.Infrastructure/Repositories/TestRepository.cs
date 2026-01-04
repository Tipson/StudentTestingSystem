using Assessment.Application.Interfaces;
using Assessment.Domain.Tests;
using Assessment.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Assessment.Infrastructure.Repositories;

public sealed class TestRepository(AssessmentDbContext db) : ITestRepository
{
    public Task<Test?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db.Tests.FirstOrDefaultAsync(x => x.Id == id, ct);
    
    public Task<List<Test>> ListByOwnerAsync(string ownerId, CancellationToken ct) =>
        db.Tests
            .Where(x => x.OwnerUserId == ownerId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
    
    public async Task AddAsync(Test test, CancellationToken ct)
    {
        await db.Tests.AddAsync(test, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Test test, CancellationToken ct)
    {
        db.Tests.Update(test);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Test test, CancellationToken ct)
    {
        db.Tests.Remove(test);
        await db.SaveChangesAsync(ct);
    }
}