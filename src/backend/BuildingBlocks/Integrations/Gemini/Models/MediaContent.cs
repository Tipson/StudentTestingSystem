namespace BuildingBlocks.Integrations.Gemini.Models;

/// <summary>
/// Медиа-контент для отправки в Gemini (base64).
/// </summary>
public sealed record MediaContent(
    string Base64Content, // Base64 строка
    string MimeType // "image/jpeg", "image/png", "application/pdf"
);