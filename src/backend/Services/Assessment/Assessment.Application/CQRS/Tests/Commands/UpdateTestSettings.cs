using Application;
using Assessment.Application.DTOs.Test;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Commands;

/// <summary>
/// Обновляет настройки теста (название, описание, лимиты).
/// Редактирование возможно только в статусе «Черновик» и только владельцем теста.
/// </summary>
public sealed record UpdateTestSettings(Guid TestId, UpdateTestSettingsDto Dto) : IRequest<TestDto>;

public sealed class UpdateTestSettingsHandler(
    IUserContext userContext,
    ITestRepository tests)
    : IRequestHandler<UpdateTestSettings, TestDto>
{
    public async Task<TestDto> Handle(UpdateTestSettings request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var test = await tests.GetByIdAsync(request.TestId, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Нет прав на изменение теста.");

        test.UpdateSettings(
            request.Dto.Title,
            request.Dto.Description,
            request.Dto.TimeLimitSeconds,
            request.Dto.PassScore,
            request.Dto.AttemptsLimit
        );

        await tests.UpdateAsync(test, ct);

        return test.Adapt<TestDto>();
    }
}

