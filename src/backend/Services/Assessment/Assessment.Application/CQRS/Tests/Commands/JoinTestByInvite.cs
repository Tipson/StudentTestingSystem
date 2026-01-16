using Application;
using Assessment.Application.Interfaces;
using Assessment.Domain.Tests;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Commands;

/// <summary>
/// Присоединиться к тесту по ссылке-приглашению.
/// </summary>
public sealed record JoinTestByInvite(Guid InviteCode) : IRequest<Guid>;

public sealed class JoinTestByInviteHandler(
    IUserContext userContext,
    ITestRepository tests,
    ITestAccessRepository testAccesses)
    : IRequestHandler<JoinTestByInvite, Guid>
{
    public async Task<Guid> Handle(JoinTestByInvite request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Необходима авторизация.");

        var invite = await testAccesses.GetByInviteCodeAsync(request.InviteCode, ct)
                     ?? throw new EntityNotFoundException("Приглашение не найдено.");

        if (!invite.CanBeUsed())
            throw new BadRequestApiException("Приглашение истекло или исчерпано.");

        var test = await tests.GetByIdAsync(invite.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        if (!test.IsAvailable())
            throw new BadRequestApiException("Тест недоступен в данный момент.");

        // Проверяем: есть ли уже доступ?
        var existingAccess = await testAccesses.GetByTestAndUserAsync(invite.TestId, userId, ct);

        if (existingAccess is null)
        {
            // Создаём личный доступ
            var personalAccess = TestAccess.ForUser(
                invite.TestId,
                userId,
                invite.GrantedByUserId,
                invite.ExpiresAt
            );

            await testAccesses.AddAsync(personalAccess, ct);
        }

        // Увеличиваем счётчик использований
        invite.IncrementUsage();
        await testAccesses.UpdateAsync(invite, ct);

        return test.Id;
    }
}