namespace Assessment.Domain.Tests;

public partial class Test
{
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