import type { Person, Relationship } from "../api/types";

export const CARD_WIDTH = 190;
export const CARD_HEIGHT = 96;
const H_GAP = 36;
const V_GAP = 120;

export interface PositionedPerson {
  person: Person;
  x: number;
  y: number;
  generation: number;
}

export interface SpouseConnector {
  key: string;
  x1: number;
  x2: number;
  y: number;
  dashed: boolean;
}

export interface ParentChildConnector {
  key: string;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
}

export interface FamilyTreeLayout {
  positioned: PositionedPerson[];
  spouseConnectors: SpouseConnector[];
  parentChildConnectors: ParentChildConnector[];
  width: number;
  height: number;
}

// Union-find: people linked by a relationship are treated as the same generation.
class UnionFind {
  private parent = new Map<number, number>();

  find(id: number): number {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
      return id;
    }
    let root = id;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    let current = id;
    while (this.parent.get(current) !== root) {
      const next = this.parent.get(current)!;
      this.parent.set(current, root);
      current = next;
    }
    return root;
  }

  union(a: number, b: number): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootA, rootB);
    }
  }
}

function computeGenerations(people: Person[], relationships: Relationship[]): Map<number, number> {
  const uf = new UnionFind();
  for (const person of people) {
    uf.find(person.id);
  }
  for (const rel of relationships) {
    uf.union(rel.person1Id, rel.person2Id);
  }

  const groupGeneration = new Map<number, number>();
  for (const person of people) {
    const root = uf.find(person.id);
    if (!groupGeneration.has(root)) {
      groupGeneration.set(root, 0);
    }
  }

  const constraints: Array<[parentGroup: number, childGroup: number]> = [];
  for (const person of people) {
    const childGroup = uf.find(person.id);
    if (person.parent1Id != null) {
      constraints.push([uf.find(person.parent1Id), childGroup]);
    }
    if (person.parent2Id != null) {
      constraints.push([uf.find(person.parent2Id), childGroup]);
    }
  }

  // Fixed-point relaxation: a child's generation must be at least one more
  // than each parent's. Small dataset, so a bounded number of passes is plenty.
  let changed = true;
  let guard = 0;
  while (changed && guard < people.length + constraints.length + 5) {
    changed = false;
    for (const [parentGroup, childGroup] of constraints) {
      const required = groupGeneration.get(parentGroup)! + 1;
      if (groupGeneration.get(childGroup)! < required) {
        groupGeneration.set(childGroup, required);
        changed = true;
      }
    }
    guard++;
  }

  const result = new Map<number, number>();
  for (const person of people) {
    result.set(person.id, groupGeneration.get(uf.find(person.id))!);
  }
  return result;
}

const UNIT_GAP = H_GAP * 2;

interface Unit {
  key: string;
  generation: number;
  memberIds: number[];
}

export function computeFamilyTreeLayout(
  people: Person[],
  relationships: Relationship[],
): FamilyTreeLayout {
  if (people.length === 0) {
    return { positioned: [], spouseConnectors: [], parentChildConnectors: [], width: 0, height: 0 };
  }

  const generationOf = computeGenerations(people, relationships);

  const byGeneration = new Map<number, Person[]>();
  for (const person of people) {
    const gen = generationOf.get(person.id)!;
    if (!byGeneration.has(gen)) byGeneration.set(gen, []);
    byGeneration.get(gen)!.push(person);
  }
  const maxGeneration = Math.max(...byGeneration.keys());

  // Group each generation's people into "units": an individual, or a couple
  // linked by a relationship (couples are always rendered adjacent).
  const unitOfPerson = new Map<number, Unit>();
  const unitsByKey = new Map<string, Unit>();

  for (let gen = 0; gen <= maxGeneration; gen++) {
    const peopleInGen = byGeneration.get(gen) ?? [];
    const idsInGen = new Set(peopleInGen.map((p) => p.id));

    const clusterUf = new UnionFind();
    for (const person of peopleInGen) clusterUf.find(person.id);
    for (const rel of relationships) {
      if (idsInGen.has(rel.person1Id) && idsInGen.has(rel.person2Id)) {
        clusterUf.union(rel.person1Id, rel.person2Id);
      }
    }

    const grouped = new Map<number, number[]>();
    for (const person of peopleInGen) {
      const root = clusterUf.find(person.id);
      if (!grouped.has(root)) grouped.set(root, []);
      grouped.get(root)!.push(person.id);
    }

    for (const memberIds of grouped.values()) {
      const sorted = [...memberIds].sort((a, b) => a - b);
      const unit: Unit = { key: `u-${sorted.join("-")}`, generation: gen, memberIds: sorted };
      unitsByKey.set(unit.key, unit);
      for (const id of sorted) unitOfPerson.set(id, unit);
    }
  }

  // For each unit, find its distinct child units: units in the next
  // generation that contain a person whose parent is one of this unit's members.
  const childUnitsOf = new Map<string, Unit[]>();
  for (const unit of unitsByKey.values()) {
    const memberSet = new Set(unit.memberIds);
    const childUnitKeys = new Set<string>();
    for (const person of people) {
      if (
        (person.parent1Id != null && memberSet.has(person.parent1Id)) ||
        (person.parent2Id != null && memberSet.has(person.parent2Id))
      ) {
        childUnitKeys.add(unitOfPerson.get(person.id)!.key);
      }
    }
    const childUnits = [...childUnitKeys]
      .map((key) => unitsByKey.get(key)!)
      .sort((a, b) => a.memberIds[0] - b.memberIds[0]);
    childUnitsOf.set(unit.key, childUnits);
  }

  const unitWidth = (unit: Unit) =>
    unit.memberIds.length * CARD_WIDTH + (unit.memberIds.length - 1) * H_GAP;

  // Bottom-up placement: leaves (units with no recorded children) consume the
  // next slot on a cursor that's tracked per generation — only units in the
  // same row can ever collide, so each row gets its own independent cursor.
  // A unit with children is centered over the combined span of its own
  // children, so ancestors land above their descendants; if a unit's own
  // width (e.g. a couple) is wider than that span (e.g. their one child), its
  // position is clamped to its row's cursor so it can't spill into whichever
  // sibling family is placed next in that same row.
  const xById = new Map<number, number>();
  const envelopeByUnit = new Map<string, { left: number; right: number }>();
  const placedUnits = new Set<string>();
  // Tracks units currently being computed higher up the same call stack, so a
  // cycle in the underlying data (e.g. a person mistakenly recorded as their
  // own descendant's ancestor) degrades gracefully instead of recursing forever.
  const inProgress = new Set<string>();
  const cursorByGeneration = new Map<number, number>();

  function place(unit: Unit): { left: number; right: number } {
    if (placedUnits.has(unit.key)) {
      return envelopeByUnit.get(unit.key)!;
    }
    if (inProgress.has(unit.key)) {
      return { left: 0, right: 0 };
    }
    inProgress.add(unit.key);

    const rowCursor = cursorByGeneration.get(unit.generation) ?? 0;
    const children = childUnitsOf.get(unit.key) ?? [];
    let left: number;

    let childEnvelopes: Array<{ left: number; right: number }> = [];

    if (children.length === 0) {
      left = rowCursor;
    } else {
      childEnvelopes = children.map(place);
      const spanLeft = Math.min(...childEnvelopes.map((e) => e.left));
      const spanRight = Math.max(...childEnvelopes.map((e) => e.right));
      const centeredLeft = (spanLeft + spanRight) / 2 - unitWidth(unit) / 2;
      left = Math.max(rowCursor, centeredLeft);
    }

    unit.memberIds.forEach((id, index) => {
      xById.set(id, left + index * (CARD_WIDTH + H_GAP));
    });

    const right = left + unitWidth(unit);
    cursorByGeneration.set(unit.generation, right + UNIT_GAP);

    const envelope =
      children.length === 0
        ? { left, right }
        : {
            left: Math.min(left, ...childEnvelopes.map((e) => e.left)),
            right: Math.max(right, ...childEnvelopes.map((e) => e.right)),
          };
    inProgress.delete(unit.key);
    placedUnits.add(unit.key);
    envelopeByUnit.set(unit.key, envelope);
    return envelope;
  }

  const rootUnits = [...unitsByKey.values()]
    .filter((u) => u.generation === 0)
    .sort((a, b) => a.memberIds[0] - b.memberIds[0]);
  for (const unit of rootUnits) place(unit);

  // Safety net: place any unit never reached from a generation-0 root
  // (e.g. a subtree with no recorded ancestor at all).
  const remaining = [...unitsByKey.values()]
    .filter((u) => !placedUnits.has(u.key))
    .sort((a, b) => a.generation - b.generation || a.memberIds[0] - b.memberIds[0]);
  for (const unit of remaining) place(unit);

  const minX = Math.min(...xById.values());
  const positioned: PositionedPerson[] = people.map((person) => {
    const gen = generationOf.get(person.id)!;
    return {
      person,
      x: xById.get(person.id)! - minX,
      y: gen * (CARD_HEIGHT + V_GAP),
      generation: gen,
    };
  });

  const positionById = new Map(positioned.map((p) => [p.person.id, p]));

  const spouseConnectors: SpouseConnector[] = [];
  const seenPairs = new Set<string>();
  for (const rel of relationships) {
    const pairKey = [rel.person1Id, rel.person2Id].sort((a, b) => a - b).join("-");
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    const p1 = positionById.get(rel.person1Id);
    const p2 = positionById.get(rel.person2Id);
    if (!p1 || !p2) continue;

    const [left, right] = p1.x <= p2.x ? [p1, p2] : [p2, p1];
    spouseConnectors.push({
      key: `spouse-${rel.id}`,
      x1: left.x + CARD_WIDTH,
      x2: right.x,
      y: left.y + CARD_HEIGHT / 2,
      dashed: rel.type === "Divorced",
    });
  }

  const parentChildConnectors: ParentChildConnector[] = [];
  for (const person of people) {
    const child = positionById.get(person.id)!;
    const parentIds = [person.parent1Id, person.parent2Id].filter((id): id is number => id != null);
    if (parentIds.length === 0) continue;

    const parentPositions = parentIds
      .map((id) => positionById.get(id))
      .filter((p): p is PositionedPerson => p != null);
    if (parentPositions.length === 0) continue;

    const originX =
      parentPositions.reduce((sum, p) => sum + p.x + CARD_WIDTH / 2, 0) / parentPositions.length;
    const originY = Math.max(...parentPositions.map((p) => p.y + CARD_HEIGHT));

    parentChildConnectors.push({
      key: `parent-${person.id}`,
      originX,
      originY,
      targetX: child.x + CARD_WIDTH / 2,
      targetY: child.y,
    });
  }

  const width = Math.max(...positioned.map((p) => p.x + CARD_WIDTH));
  const height = Math.max(...positioned.map((p) => p.y + CARD_HEIGHT));

  return { positioned, spouseConnectors, parentChildConnectors, width, height };
}
