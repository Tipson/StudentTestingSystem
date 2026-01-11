using Assessment.Domain.Tests.Enums;

namespace Assessment.Domain.Tests;

public partial class TestAccess
{
    /// <summary>
    /// Доступ конкретному пользователю.
    /// </summary>
    public static TestAccess ForUser(Guid testId, string userId, string grantedBy, DateTimeOffset? expiresAt = null)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId обязателен", nameof(userId));

        return new TestAccess
        {
            Id = Guid.NewGuid(),
            TestId = testId,
            GrantType = TestAccessGrantType.User,
            UserId = userId,
            GrantedByUserId = grantedBy,
            GrantedAt = DateTimeOffset.UtcNow,
            ExpiresAt = expiresAt
        };
    }

    /// <summary>
    /// Доступ всей группе.
    /// </summary>
    public static TestAccess ForGroup(Guid testId, Guid groupId, string grantedBy, DateTimeOffset? expiresAt = null)
    {
        return new TestAccess
        {
            Id = Guid.NewGuid(),
            TestId = testId,
            GrantType = TestAccessGrantType.Group,
            GroupId = groupId,
            GrantedByUserId = grantedBy,
            GrantedAt = DateTimeOffset.UtcNow,
            ExpiresAt = expiresAt
        };
    }

    /// <summary>
    /// Доступ по ссылке-приглашению.
    /// </summary>
    public static TestAccess WithInviteLink(Guid testId, string grantedBy, int? maxUses = null, DateTimeOffset? expiresAt = null)
    {
        return new TestAccess
        {
            Id = Guid.NewGuid(),
            TestId = testId,
            GrantType = TestAccessGrantType.InviteLink,
            InviteCode = Guid.NewGuid(),
            GrantedByUserId = grantedBy,
            GrantedAt = DateTimeOffset.UtcNow,
            ExpiresAt = expiresAt,
            MaxUses = maxUses,
            UsedCount = 0
        };
    }

    public bool IsExpired() => ExpiresAt.HasValue && ExpiresAt.Value < DateTimeOffset.UtcNow;

    public bool CanBeUsed() => !IsExpired() && (!MaxUses.HasValue || UsedCount < MaxUses.Value);

    public void IncrementUsage()
    {
        if (!CanBeUsed())
            throw new InvalidOperationException("Приглашение больше не может быть использовано");

        UsedCount++;
    }

    public void Revoke()
    {
        ExpiresAt = DateTimeOffset.UtcNow;
    }
}