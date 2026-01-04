using Assessment.Domain.Questions;

namespace Assessment.Application.Interfaces;

public interface IQuestionRepository
{
    Task<Question?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<List<Question>> ListByTestIdAsync(Guid testId, CancellationToken ct);
    Task<int> GetNextOrderAsync(Guid testId, CancellationToken ct);
    Task AddAsync(Question question, CancellationToken ct);
    Task UpdateAsync(Question question, CancellationToken ct);
    Task DeleteAsync(Question question, CancellationToken ct);
    Task UpdateRangeAsync(IEnumerable<Question> questions, CancellationToken ct);

}