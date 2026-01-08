using Identity.Domain;
using Identity.Domain.Users;
using Identity.Domain.Groups;
using Identity.Domain.Users;
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

    public async Task<(List<Group> Items, int Total)> GetActiveAsync(
        string? institution,
        string? specialization,
        int? course,
        int page,
        int pageSize,
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

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderBy(g => g.Institution)
            .ThenBy(g => g.Specialization)
            .ThenBy(g => g.Course)
            .ThenBy(g => g.GroupNumber)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task<List<User>> GetMembersAsync(Guid groupId, CancellationToken ct = default)
    {
        return await context.Users
            .AsNoTracking()
            .Where(u => u.GroupId == groupId && u.IsActive)
            .OrderBy(u => u.FullName)
            .ToListAsync(ct);
    }

    public async Task AddAsync(Group group, CancellationToken ct = default)
    {
        await context.Groups.AddAsync(group, ct);
        await context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Group group, CancellationToken ct = default)
    {
        context.Groups.Update(group);
        await context.SaveChangesAsync(ct);
    }
}