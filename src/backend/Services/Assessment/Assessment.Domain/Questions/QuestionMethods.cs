namespace Assessment.Domain.Questions;

public partial class Question
{
    public void UpdateText(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("Текст вопроса не может быть пустым");
        
        Text = text.Trim();
    }

    public void UpdatePoints(int points)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(points);
        Points = points;
    }

    public void SetOrder(int order)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(order, 1);
        Order = order;
    }
    
    public void UpdateOptions(IEnumerable<QuestionOption> newOptions)
    {
        Options.Clear();

        foreach (var option in newOptions)
            Options.Add(option);
    }
}