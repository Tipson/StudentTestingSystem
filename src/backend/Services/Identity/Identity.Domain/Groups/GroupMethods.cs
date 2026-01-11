namespace Identity.Domain.Groups;

public partial class Group
{
    
    public void Update(string institution, string specialization, int course, int groupNumber)
    {
        if (string.IsNullOrWhiteSpace(institution))
            throw new ArgumentException("Учебное заведение обязательно", nameof(institution));

        if (string.IsNullOrWhiteSpace(specialization))
            throw new ArgumentException("Специализация обязательна", nameof(specialization));

        if (course < 1 || course > 6)
            throw new ArgumentException("Курс должен быть от 1 до 6", nameof(course));

        if (groupNumber < 1)
            throw new ArgumentException("Номер группы должен быть больше 0", nameof(groupNumber));

        Institution = institution.Trim();
        Specialization = specialization.Trim().ToUpperInvariant();
        Course = course;
        GroupNumber = groupNumber;
        Code = $"{Specialization}-{Course}-{GroupNumber}";
    }
    
    public void Deactivate()
    {
        IsActive = false;
    }

    public void Activate()
    {
        IsActive = true;
    }
    
    private static int CalculateAdmissionYear(int course)
    {
        var now = DateTimeOffset.UtcNow;
        var academicYearStart = now.Month >= 9 ? now.Year : now.Year - 1; // 1 сентября
        return academicYearStart - (course - 1);
    }
    
    public void PromoteCourse()
    {
        if (Course >= 6)
            throw new InvalidOperationException("Группа уже на максимальном курсе.");

        Course++;
        Code = $"{Specialization}-{Course}-{GroupNumber}";
    }
    
    
}