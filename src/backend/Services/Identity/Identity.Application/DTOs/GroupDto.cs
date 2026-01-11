namespace Identity.Application.DTOs;

public sealed record GroupDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Institution { get; init; } = string.Empty;
    public string Specialization { get; init; } = string.Empty;
    public int Course { get; init; }
    public int GroupNumber { get; init; }
    public int EnrollmentYear { get; init; }
}