using Assessment.Application.Interfaces;
using Assessment.Domain.Tests;
using Assessment.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Assessment.Infrastructure.Repositories;

public sealed class TestAccessRepository(AssessmentDbContext db) : ITestAccessRepository
{
    public Task<TestAccess?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db.TestAccesses
            .Include(a => a.Test)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

    public Task<TestAccess?> GetByInviteCodeAsync(Guid inviteCode, CancellationToken ct) =>
        db.TestAccesses
            .Include(a => a.Test)
            .FirstOrDefaultAsync(a => a.InviteCode == inviteCode, ct);

    public Task<List<TestAccess>> GetByTestIdAsync(Guid testId, CancellationToken ct) =>
        db.TestAccesses
            .Where(a => a.TestId == testId)
            .ToListAsync(ct);

    public Task<List<TestAccess>> GetByUserIdAsync(string userId, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
    
        return db.TestAccesses
            .Include(a => a.Test)
            .Where(a => a.UserId == userId && 
                        (!a.ExpiresAt.HasValue || a.ExpiresAt.Value >= now))
            .ToListAsync(ct);
    }

    public Task<List<TestAccess>> GetByGroupIdAsync(Guid groupId, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
    
        return db.TestAccesses
            .Include(a => a.Test)
            .Where(a => a.GroupId == groupId && 
                        (!a.ExpiresAt.HasValue || a.ExpiresAt.Value >= now))
            .ToListAsync(ct);
    }
    
    public Task<TestAccess?> GetByTestAndUserAsync(Guid testId, string userId, CancellationToken ct) =>
        db.TestAccesses
            .FirstOrDefaultAsync(a => a.TestId == testId && a.UserId == userId, ct);

    public Task<TestAccess?> GetByTestAndGroupAsync(Guid testId, Guid groupId, CancellationToken ct) =>
        db.TestAccesses
            .FirstOrDefaultAsync(a => a.TestId == testId && a.GroupId == groupId, ct);

    public async Task AddAsync(TestAccess access, CancellationToken ct)
    {
        await db.TestAccesses.AddAsync(access, ct);
        await db.SaveChangesAsync(ct);
    }

    public Task UpdateAsync(TestAccess access, CancellationToken ct) =>
        db.SaveChangesAsync(ct);

    public async Task DeleteAsync(TestAccess access, CancellationToken ct)
    {
        db.TestAccesses.Remove(access);
        await db.SaveChangesAsync(ct);
    }
}