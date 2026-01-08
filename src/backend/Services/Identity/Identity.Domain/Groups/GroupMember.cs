namespace Identity.Domain.Groups;

public class GroupMember
{
    public Guid Id { get; private set; }
    public Guid GroupId { get; private set; }
    public string UserId { get; private set; }
    public DateTimeOffset JoinedAt { get; private set; }
    
    public Group Group { get; private set; } = null!;
    
    public GroupMember(Guid groupId, string userId)
    {
        Id = Guid.NewGuid();
        GroupId = groupId;
        UserId = userId;
        JoinedAt = DateTimeOffset.UtcNow;
    }
}