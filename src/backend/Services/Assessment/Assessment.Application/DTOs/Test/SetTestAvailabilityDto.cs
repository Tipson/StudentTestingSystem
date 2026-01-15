namespace Assessment.Application.DTOs.Test;

public sealed record SetTestAvailabilityDto(
    DateTimeOffset? AvailableFrom,
    DateTimeOffset? AvailableUntil);
