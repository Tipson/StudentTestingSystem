using Assessment.Application.DTOs.Attempt;
using Assessment.Domain.Attempts;
using Assessment.Domain.Questions;
using Contracts.Assessment;
using Contracts.Assessment.Enums;
using Contracts.Grading.Enums;
using Contracts.Grading.Models;
using Mapster;

namespace Assessment.Application.CQRS.Attempts.Mapping;

public sealed class AttemptMapsterConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Attempt, AttemptDto>()
            .Map(d => d.Status, s => s.Status.ToString());

        config.NewConfig<Attempt, StudentTestResultDto>()
            .Map(d => d.AttemptId, s => s.Id)
            .Map(d => d.StudentId, s => s.UserId);

        config.NewConfig<AttemptAnswer, AttemptAnswerDto>();

        config.NewConfig<AnswerPayload, AnswerPayloadDto>();

        // Маппинг (Question, AttemptAnswer?) -> QuestionResultDto
        config.NewConfig<(Question Question, AttemptAnswer? Answer), QuestionResultDto>()
            .MapWith(src => new QuestionResultDto(
                src.Question.Id, // QuestionId
                src.Question.Text, // Text
                src.Question.Type.ToString(), // Type
                src.Question.Points, // Points
                src.Answer!.PointsAwarded ?? 0, // PointsAwarded
                src.Answer.IsCorrect ?? false, // IsCorrect
                MapUserAnswer(src.Answer), // UserAnswer
                MapCorrectAnswer(src.Question) // CorrectAnswer
            ));
        
        config.NewConfig<AttemptAnswer, GradingResult>()
            .MapWith(src => new GradingResult
            {
                IsCorrect = src.IsCorrect ?? false,
                PointsAwarded = src.PointsAwarded ?? 0,
                Type = src.ManualGradingRequired ? GradingType.Manual : GradingType.Automatic,
                RequiresManualReview = src.ManualGradingRequired,
                Feedback = src.TeacherComment
            });
        
        // Маппинг Question -> QuestionData (для CalculateScore)
        config.NewConfig<Question, QuestionData>()
            .Map(dest => dest.Id, src => src.Id)
            .Map(dest => dest.Type, src => src.Type)
            .Map(dest => dest.MaxPoints, src => src.Points)
            .Map(dest => dest.CorrectOptions, src => new List<CorrectOptionData>()); // ���⮩ ᯨ᮪
    }

    private static AnswerPayloadDto? MapUserAnswer(AttemptAnswer? answer)
    {
        if (answer is null) return null;

        return new AnswerPayloadDto(
            answer.Answer.OptionId,
            answer.Answer.OptionIds,
            answer.Answer.Text
        );
    }

    private static AnswerPayloadDto? MapCorrectAnswer(Question question)
    {
        var correctOptions = question.Options.Where(o => o.IsCorrect).ToList();

        return question.Type switch
        {
            QuestionType.SingleChoice or QuestionType.TrueFalse =>
                correctOptions.FirstOrDefault() is { } co
                    ? new AnswerPayloadDto(co.Id, null, null)
                    : null,

            QuestionType.MultiChoice =>
                new AnswerPayloadDto(null, correctOptions.Select(o => o.Id).ToList(), null),

            QuestionType.ShortText =>
                correctOptions.FirstOrDefault() is { } so
                    ? new AnswerPayloadDto(null, null, so.Text)
                    : null,

            _ => null
        };
    }
}
