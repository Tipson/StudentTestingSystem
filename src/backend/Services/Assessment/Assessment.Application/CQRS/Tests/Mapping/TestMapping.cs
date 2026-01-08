using Assessment.Application.DTOs.Test;
using Assessment.Domain.Tests;
using Mapster;

namespace Assessment.Application.CQRS.Tests.Mapping;

public sealed class TestMapping : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Test, TestDto>()
            .Map(d => d.Status, s => s.Status.ToString());
    }
}   