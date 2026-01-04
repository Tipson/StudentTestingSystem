using Contracts.Identity;
using Identity.Domain.Users;

namespace Identity.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetById(string id, CancellationToken ct);
    Task<bool> Exists(string id, CancellationToken ct);
    Task<User?> GetByEmail(string email, CancellationToken ct);
    Task AddAsync(User user, CancellationToken ct);
    Task UpdateAsync(User user, CancellationToken ct);
    Task RemoveAsync(User user, CancellationToken ct);
    Task<List<User>> GetListAsync(CancellationToken ct);
    Task<List<User>> GetByRoleAsync(UserRole role, CancellationToken ct);
    Task<List<User>> SearchAsync(string query, CancellationToken ct);
}
