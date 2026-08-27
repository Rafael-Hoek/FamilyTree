const FIELD_LABELS: Record<string, string> = {
  FirstName: "First name",
  LastName: "Last name",
  BirthDate: "Birth date",
  DateOfDeath: "Date of death",
  Parent1Id: "Parent 1",
  Parent2Id: "Parent 2",
  Person1Id: "New person",
  Person2Id: "Related person",
  StartDate: "Since",
  EndDate: "End date",
};

export function friendlyErrors(fieldErrors: Record<string, string[]>): string[] {
  return Object.entries(fieldErrors).flatMap(([field, messages]) =>
    messages.map((message) => `${FIELD_LABELS[field] ?? field}: ${message}`),
  );
}
