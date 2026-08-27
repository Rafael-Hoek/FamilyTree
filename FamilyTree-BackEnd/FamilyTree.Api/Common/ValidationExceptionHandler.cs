using Microsoft.AspNetCore.Diagnostics;

namespace FamilyTree.Api.Common;

public class ValidationExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not ValidationException validationException)
        {
            return false;
        }

        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        await Results.ValidationProblem(validationException.Errors)
            .ExecuteAsync(httpContext);

        return true;
    }
}
