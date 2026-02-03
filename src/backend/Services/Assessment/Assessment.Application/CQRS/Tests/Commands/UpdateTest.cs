using Application;
using Assessment.Application.DTOs.Test;
using Assessment.Application.Interfaces;
using BuildingBlocks.Api.Exceptions;
using BuildingBlocks.Api.Exceptions.Base;
using Contracts.Assessment.Enums;
using Mapster;
using MediatR;

namespace Assessment.Application.CQRS.Tests.Commands;

public sealed record UpdateTest(Guid Id, UpdateTestDto Dto) : IRequest<TestDto>;

public sealed class UpdateTestHandler(
    IUserContext userContext,
    ITestRepository tests)
    : IRequestHandler<UpdateTest, TestDto>
{
    public async Task<TestDto> Handle(UpdateTest request, CancellationToken ct)
    {
        var userId = userContext.UserId
                     ?? throw new UnauthorizedApiException("Пользователь не аутентифицирован.");

        var test = await tests.GetByIdAsync(request.Id, ct)
                   ?? throw new EntityNotFoundException("Тест не найден.");

        if (test.OwnerUserId != userId)
            throw new ForbiddenException("Нет доступа к редактированию теста.");

        if (test.Status == TestStatus.Published)
            throw new BadRequestApiException("Нельзя редактировать опубликованный тест. Используйте /settings для изменения настроек.");

        test.Update(
            request.Dto.Title,
            request.Dto.Description,
            request.Dto.PassScore,
            request.Dto.AttemptsLimit,
            request.Dto.TimeLimitSeconds,
            request.Dto.AllowAiHints
        );

        await tests.UpdateAsync(test, ct);

        return test.Adapt<TestDto>();
    }
}