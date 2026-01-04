using Contracts.Identity;
using Identity.Application.Interfaces;
using Identity.Domain.Users;
using Identity.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Repositories;

public sealed class UserRepository(IdentityDbContext db) : IUserRepository
{
    public Task<User?> GetById(string id, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<bool> Exists(string id, CancellationToken ct) =>
        db.Users.AnyAsync(x => x.Id == id, ct);

    public Task<User?> GetByEmail(string email, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(x => x.Email == email, ct);

    public Task AddAsync(User user, CancellationToken ct) =>
        db.Users.AddAsync(user, ct).AsTask();

    public Task UpdateAsync(User user, CancellationToken ct) =>
        db.SaveChangesAsync(ct);
    
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
        var q = (query ?? string.Empty).Trim();
        if (q.Length == 0)
            return db.Users.AsNoTracking().ToListAsync(ct);

        var ql = q.ToLower();
        return db.Users
            .AsNoTracking()
            .Where(u => (u.Email ?? "").ToLower().Contains(ql)
                        || (u.FullName ?? "").ToLower().Contains(ql))
            .ToListAsync(ct);
    }

}
