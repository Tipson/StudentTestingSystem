using Contracts.Identity;
using Identity.Application.Interfaces;
using Identity.Domain.Users;
using Identity.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Identity.Infrastructure.Repositories;

public sealed class UserRepository(IdentityDbContext db) : IUserRepository
{
    public Task<User?> GetById(string id, CancellationToken ct) =>
        db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<bool> Exists(string id, CancellationToken ct) =>
        db.Users.AnyAsync(x => x.Id == id, ct);

    public Task<User?> GetByEmail(string email, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(x => x.Email == email, ct);

    public async Task AddAsync(User user, CancellationToken ct)
    {
        await db.Users.AddAsync(user, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(User user, CancellationToken ct)
    {
        db.Users.Update(user);
        await db.SaveChangesAsync(ct);
    }
    
    public Task RemoveAsync(User user, CancellationToken ct)
    {
        db.Users.Remove(user);
        return db.SaveChangesAsync(ct);
    }
    
    public Task<List<User>> GetListAsync(CancellationToken ct) =>
        db.Users.AsNoTracking().ToListAsync(ct);

    public Task<List<User>> GetByRoleAsync(UserRole role, CancellationToken ct) =>
        db.Users.AsNoTracking().Where(u => u.Role == role).ToListAsync(ct);

    public Task<List<User>> SearchAsync(string query, CancellationToken ct)
    {
        var q = query.Trim();
        if (q.Length == 0)
            return db.Users.AsNoTracking().ToListAsync(ct);

        return db.Users
            .AsNoTracking()
            .Where(u =>
                EF.Functions.ILike(u.Email ?? "", $"%{q}%") ||
                EF.Functions.ILike(u.FullName ?? "", $"%{q}%"))
            .ToListAsync(ct);
    }
    
    public async Task<User> GetOrCreateAsync(User candidate, CancellationToken ct)
    {
        var existing = await db.Users.FindAsync([candidate.Id], ct);
        if (existing is not null)
            return existing;

        db.Users.Add(candidate);

        try
        {
            await db.SaveChangesAsync(ct);
            return candidate;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // кто-то создал параллельно
            db.ChangeTracker.Clear();

            var createdByOther = await db.Users.FindAsync([candidate.Id], ct);
            if (createdByOther is null) throw;

            return createdByOther;
        }
    }
}
