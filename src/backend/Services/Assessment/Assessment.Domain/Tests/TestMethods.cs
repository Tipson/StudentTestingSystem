using Contracts.Assessment.Enums;

namespace Assessment.Domain.Tests;

public partial class Test
{
    /// <summary>
    /// Обновить тест (только для черновиков).
    /// </summary>
    public void Update(string title, string? description, int passScore, int attemptsLimit, int? timeLimitSeconds)
    {
        if (Status == TestStatus.Published)
            throw new InvalidOperationException("Нельзя обновлять опубликованный тест.");

        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Название теста обязательно", nameof(title));

        if (passScore < 0 || passScore > 100)
            throw new ArgumentException("Проходной балл должен быть от 0 до 100", nameof(passScore));

        if (attemptsLimit <= 0)
            throw new ArgumentException("Лимит попыток должен быть больше 0", nameof(attemptsLimit));

        if (timeLimitSeconds.HasValue && timeLimitSeconds.Value <= 0)
            throw new ArgumentException("Время должно быть больше 0", nameof(timeLimitSeconds));

        Title = title;
        Description = description;
        PassScore = passScore;
        AttemptsLimit = attemptsLimit;
        TimeLimitSeconds = timeLimitSeconds;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
    
    public void Publish()
    {
        if (Status != TestStatus.Draft)
            throw new InvalidOperationException("Опубликовать можно только черновик");

        if (!Questions.Any()) 
            throw new InvalidOperationException("Нельзя опубликовать тест без вопросов");

        Status = TestStatus.Published;
        PublishedAt = DateTimeOffset.UtcNow;
    }
    
    public void Unpublish()
    {
        if (Status != TestStatus.Published)
            throw new InvalidOperationException("Тест не опубликован");
    
        Status = TestStatus.Draft;
        PublishedAt = null;
    }
    
    public void UpdateSettings(
        string title, 
        string? description, 
        int? timeLimitSeconds, 
        int passScore, 
        int attemptsLimit)
    {
        if (Status != TestStatus.Draft)
            throw new InvalidOperationException("Редактировать можно только черновик");

        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Название не может быть пустым");

        if (timeLimitSeconds is <= 0)
            throw new ArgumentException("Лимит времени должен быть больше 0");

        Title = title.Trim();
        Description = description?.Trim();
        TimeLimitSeconds = timeLimitSeconds;
        PassScore = passScore;
        AttemptsLimit = attemptsLimit;
    }
    
    
}