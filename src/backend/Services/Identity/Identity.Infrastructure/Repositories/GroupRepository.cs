using Identity.Application.Interfaces;
using Identity.Domain.Users;
using Identity.Domain.Groups;
using Identity.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Repositories;

public sealed class GroupRepository(IdentityDbContext context) : IGroupRepository
{
    public async Task<Group?> GetById(Guid id, CancellationToken ct = default)
    {
        return await context.Groups
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == id, ct);
    }

    public async Task<List<Group>> GetActiveAsync(
        string? institution,
        string? specialization,
        int? course,
        CancellationToken ct = default)
    {
        var query = context.Groups
            .AsNoTracking()
            .Where(g => g.IsActive);

        if (!string.IsNullOrWhiteSpace(institution))
            query = query.Where(g => g.Institution.Contains(institution));

        if (!string.IsNullOrWhiteSpace(specialization))
            query = query.Where(g => g.Specialization == specialization.ToUpperInvariant());

        if (course.HasValue)
            query = query.Where(g => g.Course == course.Value);

        return await query
            .OrderBy(g => g.Institution)
            .ThenBy(g => g.Specialization)
            .ThenBy(g => g.Course)
            .ThenBy(g => g.GroupNumber)
            .ToListAsync(ct);
    }

    public async Task<List<User>> GetMembersAsync(Guid groupId, CancellationToken ct = default)
    {
        return await context.Users
            .AsNoTracking()
            .Where(u => u.GroupId == groupId && u.IsActive)
            .OrderBy(u => u.FullName)
            .ToListAsync(ct);
    }

    public Task AddAsync(Group group, CancellationToken ct = default)
    {
        return context.Groups.AddAsync(group, ct).AsTask();
    }

    public Task UpdateAsync(Group group, CancellationToken ct = default)
    {
        context.Groups.Update(group);
        return Task.CompletedTask;
    }
    
    public Task RemoveAsync(Group group, CancellationToken ct = default)
    {
        context.Groups.Remove(group);
        return Task.CompletedTask;
    }
}