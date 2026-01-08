namespace Identity.Domain.Groups;

public partial class Group
{
    public void Deactivate()
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
        if (Course >= 4)
            throw new InvalidOperationException("Группа уже на максимальном курсе.");

        Course++;
        Code = $"{Specialization}-{Course}-{GroupNumber}";
    }
}