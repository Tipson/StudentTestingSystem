namespace Identity.Application.DTOs;

/// <summary>
/// DTO для массового изменения группы у студентов.
/// </summary>
public sealed record SetGroupForUsersDto(
    List<string> UserIds,
    Guid? GroupId // null = открепить от группы
);
