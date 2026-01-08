namespace Identity.Domain.Groups;

public partial class Group
{
    public Guid Id { get; private set; }
    public string Code { get; private set; }
    public string Institution { get; private set; }
    public string Specialization { get; private set; }
    public int Course { get; private set; }
    public int GroupNumber { get; private set; }
    public bool IsActive { get; private set; } = true;

    public int EnrollmentYear => CalculateEnrollmentYear(Course);


    public Group(string institution, string specialization, int course, int groupNumber)
    {
        if (string.IsNullOrWhiteSpace(institution))
            throw new ArgumentException("Учебное заведение обязательно", nameof(institution));
        
        if (string.IsNullOrWhiteSpace(specialization))
            throw new ArgumentException("Специализация обязательна", nameof(specialization));
        
        if (course < 1 || course > 6)
            throw new ArgumentException("Курс должен быть от 1 до 6", nameof(course));
        
        if (groupNumber < 1)
            throw new ArgumentException("Номер группы должен быть больше 0", nameof(groupNumber));

        Id = Guid.NewGuid();
        Institution = institution;
        Specialization = specialization.ToUpperInvariant();
        Course = course;
        GroupNumber = groupNumber;
        Code = $"{Specialization}-{Course}-{GroupNumber}"; // или можем включить Institution
        IsActive = true;
    }
}