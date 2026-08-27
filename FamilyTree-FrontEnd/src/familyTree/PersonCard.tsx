import type { Person } from "../api/types";
import { CARD_WIDTH, CARD_HEIGHT } from "./computeLayout";

function yearOf(isoDate: string | null): string | null {
  return isoDate ? isoDate.slice(0, 4) : null;
}

interface PersonCardProps {
  person: Person;
  x: number;
  y: number;
  onSelect: (personId: number) => void;
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggleCollapse: (personId: number) => void;
}

export function PersonCard({
  person,
  x,
  y,
  onSelect,
  hasChildren,
  isCollapsed,
  onToggleCollapse,
}: PersonCardProps) {
  const birthYear = yearOf(person.birthDate);
  const deathYear = yearOf(person.dateOfDeath);
  const lifespan = birthYear ? `${birthYear} – ${deathYear ?? ""}` : null;

  return (
    <div
      className="person-card"
      style={{ left: x, top: y, width: CARD_WIDTH, height: CARD_HEIGHT }}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(person.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(person.id);
        }
      }}
    >
      <div className="person-card__name">
        {person.firstName} {person.lastName}
      </div>
      {lifespan && <div className="person-card__lifespan">{lifespan}</div>}
      {hasChildren && (
        <button
          type="button"
          className="person-card__collapse-toggle"
          aria-label={isCollapsed ? "Expand descendants" : "Collapse descendants"}
          aria-expanded={!isCollapsed}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(person.id);
          }}
        >
          {isCollapsed ? "▸" : "▾"}
        </button>
      )}
    </div>
  );
}
