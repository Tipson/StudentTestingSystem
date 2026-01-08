namespace Identity.Domain.Groups;

public partial class Group
{
    public void AddMember(string userId)
    {
        if (Members.Any(m => m.UserId == userId))
            throw new InvalidOperationException("Пользователь уже в группе");

        Members.Add(new GroupMember(Id, userId));
    }

    public void RemoveMember(string userId)
    {
        var member = Members.FirstOrDefault(m => m.UserId == userId);
        if (member is not null)
            Members.Remove(member);
    }
    
    public void Archive()
    {
        IsActive = false;
    }
    
    public void Activate()
    {
        IsActive = true;
    }
    
    private static int CalculateEnrollmentYear(int course)
    {
        var now = DateTimeOffset.UtcNow;
        var academicYear = now.Month >= 9 ? now.Year : now.Year - 1;
        return academicYear - (course - 1);
    }
    
    public void PromoteCourse()
    {
        if (Course >= 6)
            throw new InvalidOperationException("Группа уже на максимальном курсе.");

        Course++;
        Code = $"{Specialization}-{Course}-{GroupNumber}";
    }
}