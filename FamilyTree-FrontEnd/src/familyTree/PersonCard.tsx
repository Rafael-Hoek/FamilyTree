import type { Person } from "../api/types";
import { useDragAwareClick } from "../components/useDragAwareClick";
import { CARD_WIDTH, CARD_HEIGHT, type TreeOrientation } from "./computeLayout";

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
  orientation: TreeOrientation;
}

export function PersonCard({
  person,
  x,
  y,
  onSelect,
  hasChildren,
  isCollapsed,
  onToggleCollapse,
  orientation,
}: PersonCardProps) {
  const birthYear = yearOf(person.birthDate);
  const deathYear = yearOf(person.dateOfDeath);
  const lifespan = birthYear ? `${birthYear} – ${deathYear ?? ""}` : null;
  const { onMouseDown, wasDrag } = useDragAwareClick();

  return (
    <div
      className="person-card"
      style={{ left: x, top: y, width: CARD_WIDTH, height: CARD_HEIGHT }}
      role="button"
      tabIndex={0}
      onMouseDown={onMouseDown}
      onClick={(e) => {
        if (!wasDrag(e)) onSelect(person.id);
      }}
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
            if (!wasDrag(e)) onToggleCollapse(person.id);
          }}
        >
          {isCollapsed
            ? orientation === "horizontal" ? "▸" : "▾"
            : orientation === "horizontal" ? "◂" : "▴"}
        </button>
      )}
    </div>
  );
}
