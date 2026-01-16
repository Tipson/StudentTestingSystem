using System.Text.Json;
using BuildingBlocks.AI.Models;
using BuildingBlocks.AI.Prompts;
using BuildingBlocks.Integrations.Gemini;
using Contracts.Assessment.Enums;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BuildingBlocks.AI.Services.Generation;

public sealed class TestGeneratorService(
    IGeminiClient gemini,
    IOptions<AIOptions> options,
    ILogger<TestGeneratorService> logger)
    : IAITestGeneratorService
{
    private readonly AIOptions _options = options.Value;

    public async Task<TestGenerationResponse?> GenerateTestAsync(
        TestGenerationRequest request,
        CancellationToken ct = default)
    {
        if (!_options.Enabled || !_options.TestGenerationEnabled)
        {
            logger.LogWarning("AI генерация тестов отключена в конфигурации");
            return null;
        }

        try
        {
            var prompt = TestGenerationPrompts.BuildTestGenerationPrompt(
                request.DocumentText,
                request.QuestionsCount,
                request.Topic);

            var response = await gemini.SendPromptAsync(prompt, ct);
            return ParseTestGenerationResponse(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ошибка при AI генерации теста");
            return null;
        }
    }

    private static TestGenerationResponse ParseTestGenerationResponse(string json)
    {
        var cleaned = json.Replace("```json", "").Replace("```", "").Trim();
        var data = JsonSerializer.Deserialize<TestGenerationData>(cleaned, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (data is null)
            throw new InvalidOperationException("Не удалось распарсить ответ Gemini");

        var questions = data.Questions.Select(q => new GeneratedQuestion(
            q.Text,
            Enum.Parse<QuestionType>(q.Type),
            q.Options,
            q.CorrectAnswer,
            q.Points
        )).ToList();

        return new TestGenerationResponse(data.TestTitle, data.Description, questions);
    }

    private sealed record TestGenerationData(
        string TestTitle,
        string? Description,
        List<QuestionData> Questions);

    private sealed record QuestionData(
        string Text,
        string Type,
        List<string>? Options,
        string? CorrectAnswer,
        int Points);
}