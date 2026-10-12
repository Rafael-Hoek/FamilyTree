import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import type { Person, Relationship } from "../api/types";
import { computeHiddenPersonIds, computePersonIdsWithChildren } from "./collapse";
import { computeFamilyTreeLayout, type ParentChildConnector, type TreeOrientation } from "./computeLayout";
import { PersonCard } from "./PersonCard";
import "./FamilyTreeView.css";

interface FamilyTreeViewProps {
  people: Person[];
  relationships: Relationship[];
  orientation: TreeOrientation;
  onSelectPerson: (personId: number) => void;
}

export interface FamilyTreeViewHandle {
  resetView: () => void;
}

const PADDING = 40;

function buildParentLinePath(c: ParentChildConnector, orientation: TreeOrientation): string {
  if (orientation === "horizontal") {
    const busX = (c.originX + c.targetX) / 2;
    return `M ${c.originX} ${c.originY} L ${busX} ${c.originY} L ${busX} ${c.targetY} L ${c.targetX} ${c.targetY}`;
  }
  const busY = (c.originY + c.targetY) / 2;
  return `M ${c.originX} ${c.originY} L ${c.originX} ${busY} L ${c.targetX} ${busY} L ${c.targetX} ${c.targetY}`;
}

export const FamilyTreeView = forwardRef<FamilyTreeViewHandle, FamilyTreeViewProps>(function FamilyTreeView(
  { people, relationships, orientation, onSelectPerson },
  ref,
) {
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  useImperativeHandle(ref, () => ({
    resetView: () => transformRef.current?.resetTransform(),
  }), []);

  const personIdsWithChildren = useMemo(() => computePersonIdsWithChildren(people), [people]);

  const hiddenIds = useMemo(
    () => computeHiddenPersonIds(collapsedIds, people, relationships),
    [collapsedIds, people, relationships],
  );

  const visiblePeople = useMemo(() => people.filter((p) => !hiddenIds.has(p.id)), [people, hiddenIds]);
  const visibleRelationships = useMemo(
    () => relationships.filter((r) => !hiddenIds.has(r.person1Id) && !hiddenIds.has(r.person2Id)),
    [relationships, hiddenIds],
  );

  const layout = useMemo(
    () => computeFamilyTreeLayout(visiblePeople, visibleRelationships, orientation),
    [visiblePeople, visibleRelationships, orientation],
  );

  function toggleCollapse(personId: number) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  }

  if (people.length === 0) {
    return <p>No family members to display yet.</p>;
  }

  const width = layout.width + PADDING * 2;
  const height = layout.height + PADDING * 2;

  return (
    <div className="family-tree-viewport">
      <TransformWrapper
        key={orientation}
        ref={transformRef}
        minScale={0.25}
        maxScale={2}
        initialScale={1}
        centerOnInit
        limitToBounds
        wheel={{ step: 0.03 }}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width, height }}>
          <div className={`family-tree family-tree--${orientation}`} style={{ width, height }}>
            <svg className="family-tree__connectors" width={width} height={height}>
              <g transform={`translate(${PADDING}, ${PADDING})`}>
                {layout.parentChildConnectors.map((c) => (
                  <path
                    key={c.key}
                    d={buildParentLinePath(c, orientation)}
                    className="family-tree__parent-line"
                  />
                ))}
                {layout.spouseConnectors.map((c) => (
                  <line
                    key={c.key}
                    x1={c.x1}
                    y1={c.y1}
                    x2={c.x2}
                    y2={c.y2}
                    className={
                      c.dashed
                        ? "family-tree__spouse-line family-tree__spouse-line--dashed"
                        : "family-tree__spouse-line"
                    }
                  />
                ))}
              </g>
            </svg>

            <div className="family-tree__cards" style={{ left: PADDING, top: PADDING }}>
              {layout.positioned.map((p) => (
                <PersonCard
                  key={p.person.id}
                  person={p.person}
                  x={p.x}
                  y={p.y}
                  onSelect={onSelectPerson}
                  hasChildren={personIdsWithChildren.has(p.person.id)}
                  isCollapsed={collapsedIds.has(p.person.id)}
                  onToggleCollapse={toggleCollapse}
                  orientation={orientation}
                />
              ))}
            </div>
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
});
