import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, deletePerson, updatePerson } from "../api/client";
import { friendlyErrors } from "../api/errorFormatting";
import type { Person, Relationship } from "../api/types";
import { PersonFieldsFieldset } from "../components/PersonFields";
import { fieldsToRequest, personToFields, type PersonFieldsState } from "../components/personFieldsState";
import { RelationshipsModal } from "./RelationshipsModal";
import "../components/Modal.css";
import "./PersonDetailModal.css";

function fullName(person: Person): string {
  return `${person.firstName} ${person.lastName}`;
}

function formatDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

interface PersonDetailModalProps {
  person: Person;
  people: Person[];
  relationships: Relationship[];
  isLoggedIn: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function PersonDetailModal({
  person,
  people,
  relationships,
  isLoggedIn,
  onClose,
  onChanged,
}: PersonDetailModalProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [fields, setFields] = useState<PersonFieldsState>(() => personToFields(person));
  const [saving, setSaving] = useState(false);
  const [errorLines, setErrorLines] = useState<string[]>([]);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isEditingRelationships, setIsEditingRelationships] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isEditingRelationships) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isEditingRelationships]);

  function startEdit() {
    setFields(personToFields(person));
    setErrorLines([]);
    setMode("edit");
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrorLines([]);
    try {
      await updatePerson(person.id, fieldsToRequest(fields));
      onChanged();
      setMode("view");
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        setErrorLines(friendlyErrors(error.fieldErrors));
      } else if (error instanceof ApiError) {
        setErrorLines([error.message]);
      } else {
        setErrorLines(["Something went wrong while saving. Please try again."]);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deletePerson(person.id);
      onChanged();
      onClose();
    } catch (error) {
      setDeleteError(error instanceof ApiError ? error.message : "Could not delete this person.");
      setDeleting(false);
    }
  }

  const parent1 = person.parent1Id != null ? (people.find((p) => p.id === person.parent1Id) ?? null) : null;
  const parent2 = person.parent2Id != null ? (people.find((p) => p.id === person.parent2Id) ?? null) : null;

  const personRelationships = relationships
    .filter((r) => r.person1Id === person.id || r.person2Id === person.id)
    .map((r) => {
      const otherId = r.person1Id === person.id ? r.person2Id : r.person1Id;
      const other = people.find((p) => p.id === otherId);
      return { relationship: r, otherName: other ? fullName(other) : "Unknown" };
    });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel person-detail" onClick={(e) => e.stopPropagation()}>
        {mode === "view" ? (
          <div className="person-detail__view">
            <h2>{fullName(person)}</h2>

            {person.pictureUrl && (
              <img
                className="person-detail__picture"
                src={person.pictureUrl}
                alt={fullName(person)}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}

            <dl className="person-detail__fields">
              {person.birthLastName && (
                <>
                  <dt>Birth last name</dt>
                  <dd>{person.birthLastName}</dd>
                </>
              )}
              <dt>Gender</dt>
              <dd>{person.gender ?? "—"}</dd>
              <dt>Birth date</dt>
              <dd>{formatDate(person.birthDate) ?? "—"}</dd>
              <dt>Birth place</dt>
              <dd>{person.birthPlace ?? "—"}</dd>
              <dt>Date of death</dt>
              <dd>{formatDate(person.dateOfDeath) ?? "—"}</dd>
              <dt>Death place</dt>
              <dd>{person.deathPlace ?? "—"}</dd>
              <dt>Parent 1</dt>
              <dd>{parent1 ? fullName(parent1) : "—"}</dd>
              <dt>Parent 2</dt>
              <dd>{parent2 ? fullName(parent2) : "—"}</dd>
              {personRelationships.length > 0 && (
                <>
                  <dt>Relationships</dt>
                  <dd>
                    <ul className="person-detail__relationships">
                      {personRelationships.map(({ relationship, otherName }) => (
                        <li key={relationship.id}>
                          {relationship.type} to {otherName}
                          {relationship.startDate ? ` since ${formatDate(relationship.startDate)}` : ""}
                          {relationship.endDate ? ` until ${formatDate(relationship.endDate)}` : ""}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </>
              )}
              {person.biography && (
                <>
                  <dt>Biography</dt>
                  <dd>{person.biography}</dd>
                </>
              )}
            </dl>

            {confirmingDelete ? (
              <div className="person-detail__confirm-delete" role="alert">
                <p>
                  Delete <strong>{fullName(person)}</strong>? Any children keep their own record but lose this
                  parent link, and any relationships involving them are removed. This cannot be undone.
                </p>
                {deleteError && <p className="person-detail__error">{deleteError}</p>}
                <div className="person-detail__actions">
                  <button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                    Cancel
                  </button>
                  <button type="button" className="person-detail__danger" onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="person-detail__actions">
                <button type="button" onClick={onClose}>
                  Close
                </button>
                {isLoggedIn && (
                  <>
                    <button type="button" onClick={startEdit}>
                      Update
                    </button>
                    <button type="button" onClick={() => setIsEditingRelationships(true)}>
                      Edit relationships
                    </button>
                    <button type="button" className="person-detail__danger" onClick={() => setConfirmingDelete(true)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <form className="person-detail__edit" onSubmit={handleSave}>
            <h2>Edit {fullName(person)}</h2>

            {errorLines.length > 0 && (
              <div className="person-detail__errors" role="alert">
                <ul>
                  {errorLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            <PersonFieldsFieldset
              value={fields}
              onChange={setFields}
              people={people}
              excludePersonId={person.id}
              disabled={saving}
            />

            <div className="person-detail__actions">
              <button type="button" onClick={() => setMode("view")} disabled={saving}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>

      {isEditingRelationships && isLoggedIn && (
        <RelationshipsModal
          person={person}
          people={people}
          relationships={relationships}
          onClose={() => setIsEditingRelationships(false)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
