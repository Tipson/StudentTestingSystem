using Identity.Domain.Groups;
using Identity.Domain.Users;

namespace Identity.Application.Interfaces;

public interface IGroupRepository
{
    Task<Group?> GetById(Guid id, CancellationToken ct = default);
    Task<List<Group>> GetActiveAsync(string? institution, string? specialization, int? course, CancellationToken ct = default);
    Task<List<User>> GetMembersAsync(Guid groupId, CancellationToken ct = default);
    Task AddAsync(Group group, CancellationToken ct = default);
    Task UpdateAsync(Group group, CancellationToken ct = default);
    Task RemoveAsync(Group group, CancellationToken ct = default);
}