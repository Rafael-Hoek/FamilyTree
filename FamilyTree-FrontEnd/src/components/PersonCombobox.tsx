import { useEffect, useRef, useState } from "react";
import type { Person } from "../api/types";
import "./PersonCombobox.css";

function displayName(person: Person): string {
  const year = person.birthDate ? person.birthDate.slice(0, 4) : null;
  return year ? `${person.firstName} ${person.lastName} (${year})` : `${person.firstName} ${person.lastName}`;
}

interface PersonComboboxProps {
  id?: string;
  people: Person[];
  value: number | null;
  onChange: (personId: number | null) => void;
  placeholder?: string;
  excludeIds?: number[];
}

export function PersonCombobox({ id, people, value, onChange, placeholder, excludeIds }: PersonComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = people.find((p) => p.id === value) ?? null;
  const excluded = new Set(excludeIds ?? []);
  const inputValue = isOpen ? query : (selected ? displayName(selected) : "");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const options = people
    .filter((p) => !excluded.has(p.id))
    .filter((p) => normalizedQuery === "" || displayName(p).toLowerCase().includes(normalizedQuery));

  return (
    <div className="person-combobox" ref={containerRef}>
      <div className="person-combobox__input-row">
        <input
          id={id}
          type="text"
          className="person-combobox__input"
          value={inputValue}
          placeholder={placeholder ?? "Search for a person…"}
          autoComplete="off"
          onFocus={() => {
            setIsOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
        />
        {selected && !isOpen && (
          <button
            type="button"
            className="person-combobox__clear"
            aria-label="Clear selection"
            onClick={() => onChange(null)}
          >
            ×
          </button>
        )}
      </div>
      {isOpen && (
        <ul className="person-combobox__options">
          {options.length === 0 && <li className="person-combobox__empty">No matches</li>}
          {options.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                className="person-combobox__option"
                onClick={() => {
                  onChange(person.id);
                  setIsOpen(false);
                }}
              >
                {displayName(person)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
