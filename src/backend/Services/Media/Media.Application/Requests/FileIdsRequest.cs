using System.ComponentModel.DataAnnotations;

namespace Media.Application.Requests;

/// <summary>
/// Запрос на операции с файлами (получение/удаление/скачивание).
/// </summary>
public sealed class FileIdsRequest
{
    /// <summary>
    /// Список идентификаторов файлов (от 1 до 100).
    /// </summary>
    [Required]
    [MinLength(1, ErrorMessage = "Необходимо указать хотя бы один ID")]
    [MaxLength(100, ErrorMessage = "Максимум 100 файлов за один запрос")]
    public List<Guid> Ids { get; set; } = new();
}