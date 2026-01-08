using Application;
using Assessment.Application.Interfaces;
using Assessment.Domain.Tests;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Identity;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Commands;

/// <summary>
/// Создать ссылку-приглашение для теста.
/// </summary>
public sealed record CreateInviteLink(
    Guid TestId,
    int? MaxUses = null,
    DateTimeOffset? ExpiresAt = null
) : IRequest<CreateInviteLinkResult>;

public sealed record CreateInviteLinkResult(Guid InviteCode, string Url);

public sealed class CreateInviteLinkHandler(
    IUserContext userContext,
    ITestRepository tests,
    ITestAccessRepository testAccesses)
    : IRequestHandler<CreateInviteLink, CreateInviteLinkResult>
{
    public async Task<CreateInviteLinkResult> Handle(CreateInviteLink request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Только владелец теста может создавать ссылки.");

        var access = TestAccess.WithInviteLink(
            request.TestId,
            userId,
            request.MaxUses,
            request.ExpiresAt
        );

        await testAccesses.AddAsync(access, ct);

        var url = $"/tests/join/{access.InviteCode}";

        return new CreateInviteLinkResult(access.InviteCode!.Value, url);
    }
}