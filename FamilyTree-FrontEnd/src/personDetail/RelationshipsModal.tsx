import { useEffect, useState } from "react";
import { ApiError, createRelationship, deleteRelationship, updateRelationship } from "../api/client";
import { friendlyErrors } from "../api/errorFormatting";
import type { Person, Relationship, RelationshipRequest, RelationshipType } from "../api/types";
import { PersonCombobox } from "../components/PersonCombobox";
import "../components/Modal.css";
import "./RelationshipsModal.css";

const RELATIONSHIP_TYPES: RelationshipType[] = ["Married", "Partnered", "Divorced", "Widowed", "Unknown"];

interface RelationshipRow {
  key: string;
  id: number | null;
  otherPersonId: number | null;
  type: RelationshipType;
  startDate: string;
  endDate: string;
  saving: boolean;
  deleting: boolean;
  errorLines: string[];
}

function toRow(rel: Relationship, personId: number): RelationshipRow {
  return {
    key: `existing-${rel.id}`,
    id: rel.id,
    otherPersonId: rel.person1Id === personId ? rel.person2Id : rel.person1Id,
    type: rel.type,
    startDate: rel.startDate ?? "",
    endDate: rel.endDate ?? "",
    saving: false,
    deleting: false,
    errorLines: [],
  };
}

let newRowCounter = 0;

interface RelationshipsModalProps {
  person: Person;
  people: Person[];
  relationships: Relationship[];
  onClose: () => void;
  onChanged: () => void;
}

export function RelationshipsModal({ person, people, relationships, onClose, onChanged }: RelationshipsModalProps) {
  const [rows, setRows] = useState<RelationshipRow[]>(() =>
    relationships
      .filter((r) => r.person1Id === person.id || r.person2Id === person.id)
      .map((r) => toRow(r, person.id)),
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function updateRow(key: string, patch: Partial<RelationshipRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    newRowCounter += 1;
    setRows((prev) => [
      ...prev,
      {
        key: `new-${newRowCounter}`,
        id: null,
        otherPersonId: null,
        type: "Married",
        startDate: "",
        endDate: "",
        saving: false,
        deleting: false,
        errorLines: [],
      },
    ]);
  }

  async function handleSave(key: string) {
    const row = rows.find((r) => r.key === key);
    if (!row) return;

    if (row.otherPersonId == null) {
      updateRow(key, { errorLines: ["Select the other person."] });
      return;
    }

    updateRow(key, { saving: true, errorLines: [] });

    const request: RelationshipRequest = {
      person1Id: person.id,
      person2Id: row.otherPersonId,
      type: row.type,
      startDate: row.startDate || null,
      endDate: row.endDate || null,
    };

    try {
      const saved = row.id != null ? await updateRelationship(row.id, request) : await createRelationship(request);
      updateRow(key, { id: saved.id, saving: false });
      onChanged();
    } catch (error) {
      updateRow(key, {
        saving: false,
        errorLines:
          error instanceof ApiError && error.fieldErrors
            ? friendlyErrors(error.fieldErrors)
            : [error instanceof ApiError ? error.message : "Could not save this relationship."],
      });
    }
  }

  async function handleDelete(key: string) {
    const row = rows.find((r) => r.key === key);
    if (!row) return;

    if (row.id == null) {
      setRows((prev) => prev.filter((r) => r.key !== key));
      return;
    }

    updateRow(key, { deleting: true, errorLines: [] });
    try {
      await deleteRelationship(row.id);
      setRows((prev) => prev.filter((r) => r.key !== key));
      onChanged();
    } catch (error) {
      updateRow(key, {
        deleting: false,
        errorLines: [error instanceof ApiError ? error.message : "Could not delete this relationship."],
      });
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="modal-panel relationships-modal" onClick={(e) => e.stopPropagation()}>
        <h2>
          Edit relationships — {person.firstName} {person.lastName}
        </h2>

        <div className="relationships-modal__rows">
          {rows.length === 0 && <p className="relationships-modal__empty">No relationships yet.</p>}
          {rows.map((row) => (
            <div className="relationships-modal__row" key={row.key}>
              {row.errorLines.length > 0 && (
                <div className="relationships-modal__errors" role="alert">
                  <ul>
                    {row.errorLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="relationships-modal__row-fields">
                <label>
                  Person
                  <PersonCombobox
                    people={people}
                    value={row.otherPersonId}
                    onChange={(id) => updateRow(row.key, { otherPersonId: id })}
                    placeholder="Search for a person…"
                    excludeIds={[person.id]}
                  />
                </label>
                <label>
                  Type
                  <select
                    value={row.type}
                    onChange={(e) => updateRow(row.key, { type: e.target.value as RelationshipType })}
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
                    value={row.startDate}
                    onChange={(e) => updateRow(row.key, { startDate: e.target.value })}
                  />
                </label>
                <label>
                  Until
                  <input
                    type="date"
                    value={row.endDate}
                    onChange={(e) => updateRow(row.key, { endDate: e.target.value })}
                  />
                </label>
              </div>
              <div className="relationships-modal__row-actions">
                <button
                  type="button"
                  className="relationships-modal__danger"
                  onClick={() => handleDelete(row.key)}
                  disabled={row.saving || row.deleting}
                >
                  {row.deleting ? "Deleting…" : "Delete"}
                </button>
                <button type="button" onClick={() => handleSave(row.key)} disabled={row.saving || row.deleting}>
                  {row.saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="relationships-modal__footer">
          <button type="button" onClick={addRow}>
            + Add relationship
          </button>
          <button type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
