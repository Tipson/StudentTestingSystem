using Assessment.Application.Interfaces;
using Assessment.Domain.AI;
using Assessment.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Assessment.Infrastructure.Repositories;

public sealed class HintUsageRepository(AssessmentDbContext context) : IHintUsageRepository
{
    public async Task<int> CountByAttemptAsync(Guid attemptId, CancellationToken ct = default)
    {
        return await context.HintUsages
            .Where(h => h.AttemptId == attemptId)
            .CountAsync(ct);
    }

    public async Task AddAsync(HintUsage hintUsage, CancellationToken ct = default)
    {
        await context.HintUsages.AddAsync(hintUsage, ct);
        await context.SaveChangesAsync(ct);
    }

    public async Task<List<HintUsage>> GetByAttemptAsync(Guid attemptId, CancellationToken ct = default)
    {
        return await context.HintUsages
            .Where(h => h.AttemptId == attemptId)
            .OrderBy(h => h.RequestedAt)
            .ToListAsync(ct);
    }
}