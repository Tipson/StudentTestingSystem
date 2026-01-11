using Assessment.Domain.Tests.Enums;

namespace Assessment.Domain.Tests;

/// <summary>
/// Предоставление доступа к тесту.
/// </summary>
public partial class TestAccess
{
    public Guid Id { get; private set; }
    public Guid TestId { get; private set; }
    
    // Тип доступа
    public TestAccessGrantType GrantType { get; private set; }
    
    // Для кого доступ
    public string? UserId { get; private set; }
    public Guid? GroupId { get; private set; }
    public Guid? InviteCode { get; private set; }
    
    // Метаданные
    public string GrantedByUserId { get; private set; }
    public DateTimeOffset GrantedAt { get; private set; }
    public DateTimeOffset? ExpiresAt { get; private set; }
    
    // Для InviteLink
    public int? MaxUses { get; private set; }
    public int UsedCount { get; private set; }
    
    // Navigation
    public Test Test { get; private set; } = null!;
}