using Assessment.Application.DTOs.Test;
using Assessment.Domain.Tests;
using Mapster;

namespace Assessment.Application.CQRS.Tests.Mapping;

public sealed class TestMapping : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        // Базовый маппинг Test -> TestDto (без попыток)
        config.NewConfig<Test, TestDto>()
            .Map(d => d.Status, s => s.Status.ToString())
            .Map(d => d.RemainingAttempts, s => 0); // По умолчанию 0
        
        // Маппинг (Test, int usedAttempts) -> TestDto с вычислением RemainingAttempts
        config.NewConfig<(Test test, int usedAttempts), TestDto>()
            .Map(d => d.Id, s => s.test.Id)
            .Map(d => d.Title, s => s.test.Title)
            .Map(d => d.Description, s => s.test.Description)
            .Map(d => d.OwnerUserId, s => s.test.OwnerUserId)
            .Map(d => d.Status, s => s.test.Status.ToString())
            .Map(d => d.TimeLimitSeconds, s => s.test.TimeLimitSeconds)
            .Map(d => d.PassScore, s => s.test.PassScore)
            .Map(d => d.AttemptsLimit, s => s.test.AttemptsLimit)
            .Map(d => d.AllowAiHints, s => s.test.AllowAiHints)
            .Map(d => d.CreatedAt, s => s.test.CreatedAt)
            .Map(d => d.PublishedAt, s => s.test.PublishedAt)
            .Map(d => d.RemainingAttempts, s => CalculateRemainingAttempts(s.test.AttemptsLimit, s.usedAttempts));
    }

    private static int CalculateRemainingAttempts(int attemptsLimit, int usedAttempts)
    {
        // AttemptsLimit = 0 означает неограниченное количество попыток
        if (attemptsLimit == 0)
            return int.MaxValue;

        return Math.Max(0, attemptsLimit - usedAttempts);
    }
}
