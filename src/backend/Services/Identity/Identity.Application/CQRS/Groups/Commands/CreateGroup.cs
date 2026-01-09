using Identity.Application.Interfaces;
using Identity.Domain.Groups;
using MediatR;

namespace Identity.Application.CQRS.Groups.Commands;

public sealed record CreateGroup(
    string Institution,
    string Specialization,
    int Course,
    int GroupNumber) : IRequest<Guid>;

public sealed class CreateGroupHandler(
    IGroupRepository groups
) : IRequestHandler<CreateGroup, Guid>
{
    public async Task<Guid> Handle(CreateGroup request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Institution))
            throw new InvalidOperationException("Institution обязателен.");

        if (string.IsNullOrWhiteSpace(request.Specialization))
            throw new InvalidOperationException("Specialization обязателен.");

        if (request.Course < 1 || request.Course > 6)
            throw new InvalidOperationException("Course должен быть от 1 до 6.");

        if (request.GroupNumber < 1)
            throw new InvalidOperationException("GroupNumber должен быть >= 1.");

        var group = new Group(
            request.Institution,
            request.Specialization,
            request.Course,
            request.GroupNumber
        );

        await groups.AddAsync(group, ct);
        return group.Id;
    }
}