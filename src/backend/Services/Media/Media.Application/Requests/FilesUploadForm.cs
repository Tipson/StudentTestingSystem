using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Media.Application.Requests;

public sealed class FilesUploadForm
{
    [Required]
    [MinLength(1, ErrorMessage = "Необходимо загрузить хотя бы один файл")]
    [MaxLength(5, ErrorMessage = "Максимум 5 файлов за один запрос")]
    public List<IFormFile> Files { get; set; } = new();
}