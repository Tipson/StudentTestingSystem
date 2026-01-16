using BuildingBlocks.AI;
using BuildingBlocks.AI.Models;
using BuildingBlocks.AI.Services.Grading;
using Contracts.Assessment;
using Contracts.Assessment.Enums;
using Contracts.Grading.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Grading.Application.Strategies;

/// <summary>
/// Проверка длинных текстовых ответов через AI.
/// </summary>
public sealed class LongTextGrader(
    IAIGradingService aiGradingService,
    ILogger<LongTextGrader> logger,
    IOptions<AIOptions> options)
    : IQuestionGrader
{
    public QuestionType QuestionType => QuestionType.LongText;
    private readonly AIOptions _options = options.Value;

    public GradingResult Grade(AnswerPayload answer, QuestionData question)
    {
        if (string.IsNullOrWhiteSpace(answer.Text))
        {
            return GradingResult.Incorrect();
        }

        try
        {
            // Пытаемся проверить через AI
            var aiRequest = new GradingRequest(
                QuestionText: question.Text ?? string.Empty,
                ExpectedAnswer: question.CorrectOptions.FirstOrDefault()?.Text,
                StudentAnswer: answer.Text,
                MaxPoints: question.MaxPoints
            );

            var aiResponse = aiGradingService.SuggestGradeAsync(aiRequest).GetAwaiter().GetResult();

            if (aiResponse is not null)
            {
                
                if (aiResponse.Confidence >= _options.MinimumConfidenceThreshold)
                {
                    logger.LogInformation(
                        "AI проверил вопрос {QuestionId} с уверенностью {Confidence:P0}",
                        question.Id, aiResponse.Confidence);
                    
                    return GradingResult.AIGraded(
                        aiResponse.Points,
                        aiResponse.Comment,
                        aiResponse.Confidence
                    );
                }
                
                logger.LogWarning(
                    "AI недостаточно уверен ({Confidence:P0} < {Threshold:P0}), требуется ручная проверка",
                    aiResponse.Confidence, _options.MinimumConfidenceThreshold);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "AI проверка не удалась для вопроса {QuestionId}, требуется ручная проверка", question.Id);
        }

        // Если AI не смог проверить - требуется ручная проверка
        return GradingResult.ManualReviewRequired();
    }
}