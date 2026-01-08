namespace Assessment.Domain.Questions;

public partial class QuestionOption
{
    /// <summary>
    /// Добавить медиафайл к варианту ответа.
    /// </summary>
    public void AddMedia(Guid mediaId, int order = 0)
    {
        if (mediaId == Guid.Empty)
            throw new ArgumentException("MediaId не может быть пустым", nameof(mediaId));

        var actualOrder = order > 0 ? order : Media.Count + 1;

        Media.Add(new QuestionOptionMedia
        {
            MediaId = mediaId,
            Order = actualOrder
        });
    }

    /// <summary>
    /// Заменить все медиафайлы варианта.
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
}