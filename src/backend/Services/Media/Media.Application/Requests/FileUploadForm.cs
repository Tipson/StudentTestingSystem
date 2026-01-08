using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Media.Application.Requests;

public sealed class FileUploadForm
{
    [Required]
    public IFormFile File { get; set; } = default!;
}