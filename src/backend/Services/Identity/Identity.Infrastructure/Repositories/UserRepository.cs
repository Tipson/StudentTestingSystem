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
        db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Email == email, ct);

    public Task AddAsync(User user, CancellationToken ct)
    {
        return db.Users.AddAsync(user, ct).AsTask();
    }

    public Task UpdateAsync(User user, CancellationToken ct)
    {
        db.Users.Update(user);
        return Task.CompletedTask;
    }
    
    public Task RemoveAsync(User user, CancellationToken ct)
    {
        db.Users.Remove(user);
        return Task.CompletedTask;
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
    
    /// <summary>
    /// Атомарная операция получения или создания пользователя.
    /// ВАЖНО: Вызывает SaveChanges напрямую для обработки race conditions через unique constraint.
    /// Это исключение из правила "репозитории не сохраняют" - оправдано для атомарности.
    /// </summary>
    public async Task<User> GetOrCreateAsync(User candidate, CancellationToken ct)
    {
        var existing = await db.Users.FindAsync([candidate.Id], ct);
        if (existing is not null)
            return existing;

        db.Users.Add(candidate);

        try
        {
            // Сохраняем сразу для проверки unique constraint и обработки race condition
            await db.SaveChangesAsync(ct);
            return candidate;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            db.ChangeTracker.Clear();

            var createdByOther = await db.Users.FindAsync([candidate.Id], ct);
            if (createdByOther is null) throw;

            return createdByOther;
        }
    }
}
