using Identity.Domain.Groups;
using Identity.Domain.Users;

namespace Identity.Domain;

public interface IGroupRepository
{
    Task<Group?> GetById(Guid id, CancellationToken ct = default);
    Task<(List<Group> Items, int Total)> GetActiveAsync(
        string? institution,
        string? specialization,
        int? course,
        int page,
        int pageSize,
        CancellationToken ct = default);
    Task<List<User>> GetMembersAsync(Guid groupId, CancellationToken ct = default);
    Task AddAsync(Group group, CancellationToken ct = default);
    Task UpdateAsync(Group group, CancellationToken ct = default);
}