namespace FamilyTree.Api.Common;

public class ValidationException(IDictionary<string, string[]> errors) : Exception
{
    public IDictionary<string, string[]> Errors { get; } = errors;

    public ValidationException(string field, string error)
        : this(new Dictionary<string, string[]> { [field] = [error] })
    {
    }
}
