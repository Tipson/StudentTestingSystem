using Assessment.Application.DTOs.Question;
using Assessment.Domain.Questions;
using Mapster;

namespace Assessment.Application.CQRS.Questions.Mapping;

public sealed class QuestionMapping : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Question, QuestionDto>()
            .Map(dest => dest.Options, src => src.Options.OrderBy(o => o.Order))
            .Map(dest => dest.Media, src => src.Media.OrderBy(m => m.Order));

        config.NewConfig<QuestionOption, QuestionOptionDto>()
            .Map(dest => dest.Media, src => src.Media.OrderBy(m => m.Order));
    }
}