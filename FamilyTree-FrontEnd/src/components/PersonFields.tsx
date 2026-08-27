import type { Gender, Person } from "../api/types";
import { PersonCombobox } from "./PersonCombobox";
import type { PersonFieldsState } from "./personFieldsState";
import "./PersonFields.css";

const GENDERS: Gender[] = ["Male", "Female", "Other", "Unknown"];

interface PersonFieldsFieldsetProps {
  value: PersonFieldsState;
  onChange: (next: PersonFieldsState) => void;
  people: Person[];
  excludePersonId?: number;
  disabled?: boolean;
}

export function PersonFieldsFieldset({
  value,
  onChange,
  people,
  excludePersonId,
  disabled,
}: PersonFieldsFieldsetProps) {
  function set<K extends keyof PersonFieldsState>(key: K, next: PersonFieldsState[K]) {
    onChange({ ...value, [key]: next });
  }

  const selectablePeople = excludePersonId != null ? people.filter((p) => p.id !== excludePersonId) : people;

  return (
    <fieldset className="person-fields" disabled={disabled}>
      <div className="person-fields__row">
        <label>
          First name *
          <input value={value.firstName} onChange={(e) => set("firstName", e.target.value)} required />
        </label>
        <label>
          Last name *
          <input value={value.lastName} onChange={(e) => set("lastName", e.target.value)} required />
        </label>
      </div>

      <div className="person-fields__row">
        <label>
          Birth last name
          <input value={value.birthLastName} onChange={(e) => set("birthLastName", e.target.value)} />
        </label>
        <label>
          Gender
          <select value={value.gender} onChange={(e) => set("gender", e.target.value as Gender | "")}>
            <option value="">—</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="person-fields__row">
        <label>
          Birth date
          <input type="date" value={value.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
        </label>
        <label>
          Birth place
          <input value={value.birthPlace} onChange={(e) => set("birthPlace", e.target.value)} />
        </label>
      </div>

      <div className="person-fields__row">
        <label>
          Date of death
          <input type="date" value={value.dateOfDeath} onChange={(e) => set("dateOfDeath", e.target.value)} />
        </label>
        <label>
          Death place
          <input value={value.deathPlace} onChange={(e) => set("deathPlace", e.target.value)} />
        </label>
      </div>

      <label>
        Picture URL
        <input value={value.pictureUrl} onChange={(e) => set("pictureUrl", e.target.value)} />
      </label>

      <label>
        Biography
        <textarea value={value.biography} onChange={(e) => set("biography", e.target.value)} rows={3} />
      </label>

      <div className="person-fields__row">
        <label>
          Parent 1
          <PersonCombobox
            people={selectablePeople}
            value={value.parent1Id}
            onChange={(id) => set("parent1Id", id)}
            placeholder="Search for a parent…"
            excludeIds={value.parent2Id != null ? [value.parent2Id] : []}
          />
        </label>
        <label>
          Parent 2
          <PersonCombobox
            people={selectablePeople}
            value={value.parent2Id}
            onChange={(id) => set("parent2Id", id)}
            placeholder="Search for a parent…"
            excludeIds={value.parent1Id != null ? [value.parent1Id] : []}
          />
        </label>
      </div>
    </fieldset>
  );
}
