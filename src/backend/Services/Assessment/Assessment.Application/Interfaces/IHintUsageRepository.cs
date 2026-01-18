using Assessment.Domain.AI;

namespace Assessment.Application.Interfaces;

public interface IHintUsageRepository
{
    Task<int> CountByAttemptAsync(Guid attemptId, CancellationToken ct = default);
    Task AddAsync(HintUsage hintUsage, CancellationToken ct = default);
    Task<List<HintUsage>> GetByAttemptAsync(Guid attemptId, CancellationToken ct = default);
}