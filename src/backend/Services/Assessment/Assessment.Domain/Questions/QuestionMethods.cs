namespace Assessment.Domain.Questions;

public partial class Question
{
    public void UpdateText(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("Текст вопроса не может быть пустым");
        
        Text = text.Trim();
    }

    public void UpdatePoints(int points)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(points);
        Points = points;
    }

    public void SetOrder(int order)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(order, 1);
        Order = order;
    }
    
    public void UpdateOptions(IEnumerable<QuestionOption> newOptions)
    {
        Options.Clear();

        foreach (var option in newOptions)
            Options.Add(option);
    }
    
    /// <summary>
    /// Добавить медиафайл к вопросу.
    /// </summary>
    public void AddMedia(Guid mediaId, int order = 0)
    {
        if (mediaId == Guid.Empty)
            throw new ArgumentException("MediaId не может быть пустым", nameof(mediaId));

        var actualOrder = order > 0 ? order : Media.Count + 1;

        Media.Add(new QuestionMedia
        {
            MediaId = mediaId,
            Order = actualOrder
        });
    }

    /// <summary>
    /// Заменить все медиафайлы вопроса.
    /// </summary>
    public void SetMedia(IEnumerable<Guid> mediaIds)
    {
        Media.Clear();

        var order = 1;
        foreach (var mediaId in mediaIds)
        {
            AddMedia(mediaId, order++);
        }
    }

    /// <summary>
    /// Очистить все медиафайлы.
    /// </summary>
    public void ClearMedia()
    {
        Media.Clear();
    }
}