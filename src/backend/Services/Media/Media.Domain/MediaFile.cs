using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Media.Domain;

/// <summary>
/// Файл в хранилище.
/// </summary>
[Table("MediaFiles", Schema = "media")]
public sealed class MediaFile
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; init; }

    /// <summary>
    /// Оригинальное имя файла.
    /// </summary>
    [Required]
    [MaxLength(255)]
    public string FileName { get; init; }

    /// <summary>
    /// MIME-тип.
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string ContentType { get; init; }

    /// <summary>
    /// Размер в байтах.
    /// </summary>
    public long SizeBytes { get; init; }

    /// <summary>
    /// Путь в MinIO.
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string StoragePath { get; init; }

    /// <summary>
    /// Владелец файла.
    /// </summary>
    [Required]
    [MaxLength(64)]
    public string OwnerUserId { get; init; }

    /// <summary>
    /// Дата загрузки.
    /// </summary>
    public DateTimeOffset UploadedAt { get; init; }

    public MediaFile(
        string fileName,
        string contentType,
        long sizeBytes,
        string storagePath,
        string ownerUserId)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            throw new ArgumentException("Имя файла обязательно", nameof(fileName));

        if (string.IsNullOrWhiteSpace(contentType))
            throw new ArgumentException("Тип файла обязателен", nameof(contentType));

        if (string.IsNullOrWhiteSpace(storagePath))
            throw new ArgumentException("Путь хранения обязателен", nameof(storagePath));

        if (string.IsNullOrWhiteSpace(ownerUserId))
            throw new ArgumentException("Владелец обязателен", nameof(ownerUserId));

        if (sizeBytes <= 0)
            throw new ArgumentException("Размер должен быть положительным", nameof(sizeBytes));

        FileName = fileName.Trim();
        ContentType = contentType.Trim();
        SizeBytes = sizeBytes;
        StoragePath = storagePath.Trim();
        OwnerUserId = ownerUserId;
        UploadedAt = DateTimeOffset.UtcNow;
    }
}