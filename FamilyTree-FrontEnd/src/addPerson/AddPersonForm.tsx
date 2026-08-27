import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError, createPerson, createRelationship } from "../api/client";
import { friendlyErrors } from "../api/errorFormatting";
import type { Person, RelationshipType } from "../api/types";
import { PersonCombobox } from "../components/PersonCombobox";
import { PersonFieldsFieldset } from "../components/PersonFields";
import { emptyPersonFields, fieldsToRequest, type PersonFieldsState } from "../components/personFieldsState";
import "./AddPersonForm.css";

const RELATIONSHIP_TYPES: RelationshipType[] = ["Married", "Partnered", "Divorced", "Widowed", "Unknown"];

interface AddPersonFormProps {
  people: Person[];
  onCreated: () => void;
  onClose: () => void;
}

export function AddPersonForm({ people, onCreated, onClose }: AddPersonFormProps) {
  const [fields, setFields] = useState<PersonFieldsState>(emptyPersonFields);

  const [relatedPersonId, setRelatedPersonId] = useState<number | null>(null);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("Married");
  const [relationshipStartDate, setRelationshipStartDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorLines, setErrorLines] = useState<string[]>([]);
  const [createdButUnlinked, setCreatedButUnlinked] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrorLines([]);

    try {
      const created = await createPerson(fieldsToRequest(fields));
      onCreated();

      if (relatedPersonId != null) {
        try {
          await createRelationship({
            person1Id: created.id,
            person2Id: relatedPersonId,
            type: relationshipType,
            startDate: relationshipStartDate || null,
            endDate: null,
          });
          onCreated();
        } catch (relationshipError) {
          setCreatedButUnlinked(true);
          setErrorLines(
            relationshipError instanceof ApiError && relationshipError.fieldErrors
              ? friendlyErrors(relationshipError.fieldErrors)
              : ["The relationship could not be saved. You can try adding it again later."],
          );
          setSubmitting(false);
          return;
        }
      }

      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        setErrorLines(friendlyErrors(error.fieldErrors));
      } else if (error instanceof ApiError) {
        setErrorLines([error.message]);
      } else {
        setErrorLines(["Something went wrong while saving. Please try again."]);
      }
      setSubmitting(false);
    }
  }

  return (
    <form className="add-person-form" onSubmit={handleSubmit}>
      <h2>Add family member</h2>

      {errorLines.length > 0 && (
        <div className="add-person-form__errors" role="alert">
          {createdButUnlinked && (
            <p>
              <strong>
                {fields.firstName} {fields.lastName}
              </strong>{" "}
              was added, but the relationship below could not be saved:
            </p>
          )}
          <ul>
            {errorLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <PersonFieldsFieldset value={fields} onChange={setFields} people={people} disabled={createdButUnlinked} />

      <fieldset className="add-person-form__relationship person-fields" disabled={createdButUnlinked}>
        <legend>Relationship (optional)</legend>
        <label>
          Related person
          <PersonCombobox
            people={people}
            value={relatedPersonId}
            onChange={setRelatedPersonId}
            placeholder="Search for a partner…"
          />
        </label>
        <div className="person-fields__row">
          <label>
            Relationship type
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
              disabled={relatedPersonId == null}
            >
              {RELATIONSHIP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Since
            <input
              type="date"
              value={relationshipStartDate}
              onChange={(e) => setRelationshipStartDate(e.target.value)}
              disabled={relatedPersonId == null}
            />
          </label>
        </div>
      </fieldset>

      <div className="add-person-form__actions">
        {createdButUnlinked ? (
          <button type="button" onClick={onClose}>
            Close
          </button>
        ) : (
          <>
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
