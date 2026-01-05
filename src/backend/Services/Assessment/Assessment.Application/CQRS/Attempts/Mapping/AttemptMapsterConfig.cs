using Assessment.Application.DTOs.Attempt;
using Assessment.Domain.Attempts;
using Mapster;

namespace Assessment.Application.CQRS.Attempts.Mapping;

public sealed class AttemptMapsterConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Attempt, AttemptDto>()
            .Map(d => d.Status, s => s.Status.ToString());

        config.NewConfig<AttemptAnswer, AttemptAnswerDto>();
        config.NewConfig<AnswerPayload, AnswerPayloadDto>();
    }
}
