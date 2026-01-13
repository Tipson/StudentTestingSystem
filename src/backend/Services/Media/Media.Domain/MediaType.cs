namespace Media.Domain;

/// <summary>
/// Тип медиафайла (вычисляется на основе ContentType).
/// </summary>
public enum MediaType
{
    /// <summary>
    /// Документ (PDF, Word, Excel и т.д.).
    /// </summary>
    Document = 0,
    
    /// <summary>
    /// Изображение.
    /// </summary>
    Image = 1,
    
    /// <summary>
    /// Видео.
    /// </summary>
    Video = 2,
    
    /// <summary>
    /// Архив.
    /// </summary>
    Archive = 3
}