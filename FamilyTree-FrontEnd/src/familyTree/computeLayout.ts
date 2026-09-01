import type { Person, Relationship } from "../api/types";

export const CARD_WIDTH = 190;
export const CARD_HEIGHT = 96;
const GENERATION_GAP = 120; // horizontal gap between generation columns
const SIBLING_GAP = 36; // vertical gap between adjacent row-slots within a column
const SIBLING_MARGIN = 1; // extra rows of blank space between distinct sibling sub-bands, at every nesting level

export interface PositionedPerson {
  person: Person;
  x: number;
  y: number;
  generation: number;
}

export type TreeOrientation = "horizontal" | "vertical";

export interface SpouseConnector {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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

// A Family is the exact, unordered set of 1-2 parent ids shared by a group of
// children. This — not "couple" — is the atomic unit for parent-child
// connectors: a couple where A+B share a child, A alone has another child,
// and B alone has a third child produces three separate Family records, so a
// connector can never reach a child that isn't actually its own.
interface Family {
  key: string;
  parentIds: number[];
  children: Person[];
}

// A Unit is what occupies one slot in a generation column: either a single
// person, or a couple linked by a Relationship (rendered as two adjacent
// rows joined by a vertical spouse line).
type Unit = { kind: "solo"; person: Person } | { kind: "couple"; a: Person; b: Person; rel: Relationship };

function parentsKey(person: Person): string {
  const ids = [person.parent1Id, person.parent2Id].filter((id): id is number => id != null);
  return [...new Set(ids)].sort((a, b) => a - b).join(",");
}

function buildFamilies(people: Person[]): Map<string, Family> {
  const families = new Map<string, Family>();
  for (const person of people) {
    const key = parentsKey(person);
    if (key === "") continue; // no recorded parents -> not part of any Family
    let family = families.get(key);
    if (!family) {
      family = { key, parentIds: key.split(",").map(Number), children: [] };
      families.set(key, family);
    }
    family.children.push(person);
  }
  return families;
}

function familiesByParent(families: Map<string, Family>): Map<number, Family[]> {
  const map = new Map<number, Family[]>();
  for (const family of families.values()) {
    for (const parentId of family.parentIds) {
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(family);
    }
  }
  return map;
}

function ownFamilies(personId: number, byParent: Map<number, Family[]>): Family[] {
  return byParent.get(personId) ?? [];
}

// Families where personId is a parent, excluding the one (if any) shared
// with excludePartnerId — used to isolate a partner's "solo" children within
// a couple from the couple's shared children.
function soloFamiliesOf(personId: number, excludePartnerId: number, byParent: Map<number, Family[]>): Family[] {
  return ownFamilies(personId, byParent).filter(
    (family) => !(family.parentIds.length === 2 && family.parentIds.includes(excludePartnerId)),
  );
}

function sharedFamily(aId: number, bId: number, byParent: Map<number, Family[]>): Family | null {
  return ownFamilies(aId, byParent).find((f) => f.parentIds.length === 2 && f.parentIds.includes(bId)) ?? null;
}

function childrenOfFamilies(families: Family[]): Person[] {
  const seen = new Set<number>();
  const out: Person[] = [];
  for (const family of families) {
    for (const child of family.children) {
      if (!seen.has(child.id)) {
        seen.add(child.id);
        out.push(child);
      }
    }
  }
  return out;
}

// Generation assignment: longest-path relaxation over parent constraints,
// then equalize each relationship pair to the max of the two, iterated to a
// fixed point. Deliberately not union-find over relationships (that would
// transitively lump long relationship chains into one forced generation);
// each relationship only pulls its own two members together.
function computeGenerations(people: Person[], relationships: Relationship[]): Map<number, number> {
  const byId = new Map(people.map((p) => [p.id, p]));
  const generation = new Map(people.map((p) => [p.id, 0]));
  const maxGuard = people.length + relationships.length + 5;

  function relaxParents(): boolean {
    let changed = false;
    for (const person of people) {
      const parentIds = [person.parent1Id, person.parent2Id].filter(
        (id): id is number => id != null && byId.has(id),
      );
      if (parentIds.length === 0) continue;
      const required = Math.max(1, ...parentIds.map((id) => generation.get(id)! + 1));
      if (generation.get(person.id)! < required) {
        generation.set(person.id, required);
        changed = true;
      }
    }
    return changed;
  }

  function relaxCouples(): boolean {
    let changed = false;
    for (const rel of relationships) {
      const gA = generation.get(rel.person1Id);
      const gB = generation.get(rel.person2Id);
      if (gA == null || gB == null) continue;
      const max = Math.max(gA, gB);
      if (gA !== max) {
        generation.set(rel.person1Id, max);
        changed = true;
      }
      if (gB !== max) {
        generation.set(rel.person2Id, max);
        changed = true;
      }
    }
    return changed;
  }

  let changed = true;
  let guard = 0;
  while (changed && guard < maxGuard) {
    const parentsChanged = relaxParents();
    const couplesChanged = relaxCouples();
    changed = parentsChanged || couplesChanged;
    guard++;
  }
  return generation;
}

function unitKey(unit: Unit): string {
  return unit.kind === "solo" ? `s${unit.person.id}` : `c${unit.a.id}-${unit.b.id}`;
}

function firstMemberId(unit: Unit): number {
  return unit.kind === "solo" ? unit.person.id : unit.a.id;
}

// Maps every person who has a relationship to their (shared) couple Unit.
// Current data has no person with more than one relationship (confirmed via
// the live API); if that ever changes, this map keeps only the last-seen
// relationship for a person — a known, deliberately deferred limitation
// rather than an attempt at full serial-relationship support.
function buildUnitLookup(people: Person[], relationships: Relationship[]): Map<number, Unit> {
  const byId = new Map(people.map((p) => [p.id, p]));
  const lookup = new Map<number, Unit>();
  for (const rel of relationships) {
    const p1 = byId.get(rel.person1Id);
    const p2 = byId.get(rel.person2Id);
    if (!p1 || !p2) continue;
    const [a, b] = p1.id <= p2.id ? [p1, p2] : [p2, p1];
    const unit: Unit = { kind: "couple", a, b, rel };
    lookup.set(a.id, unit);
    lookup.set(b.id, unit);
  }
  return lookup;
}

function childUnitsOf(children: Person[], unitLookup: Map<number, Unit>): Unit[] {
  const seen = new Set<string>();
  const out: Unit[] = [];
  for (const child of [...children].sort((a, b) => a.id - b.id)) {
    const unit: Unit = unitLookup.get(child.id) ?? { kind: "solo", person: child };
    const key = unitKey(unit);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(unit);
    }
  }
  return out;
}

function ownChildUnits(personId: number, byParent: Map<number, Family[]>, unitLookup: Map<number, Unit>): Unit[] {
  return childUnitsOf(childrenOfFamilies(ownFamilies(personId, byParent)), unitLookup);
}

function coupleBands(
  a: Person,
  b: Person,
  byParent: Map<number, Family[]>,
  unitLookup: Map<number, Unit>,
): { soloA: Unit[]; shared: Unit[]; soloB: Unit[] } {
  const shared = sharedFamily(a.id, b.id, byParent);
  return {
    soloA: childUnitsOf(childrenOfFamilies(soloFamiliesOf(a.id, b.id, byParent)), unitLookup),
    shared: childUnitsOf(shared ? shared.children : [], unitLookup),
    soloB: childUnitsOf(childrenOfFamilies(soloFamiliesOf(b.id, a.id, byParent)), unitLookup),
  };
}

// Phase 1 (bottom-up, pure): how many rows does this unit's own subtree need?
// No shared mutable state — the only inputs are the data graph itself — so
// two sibling subtrees can never influence each other's size.
function requiredRows(
  unit: Unit,
  byParent: Map<number, Family[]>,
  unitLookup: Map<number, Unit>,
  cache: Map<string, number>,
  visiting: Set<string>,
): number {
  const key = unitKey(unit);
  const cached = cache.get(key);
  if (cached != null) return cached;
  if (visiting.has(key)) return 1; // cycle guard: degrade gracefully on bad data
  visiting.add(key);

  let rows: number;
  if (unit.kind === "solo") {
    const kids = ownChildUnits(unit.person.id, byParent, unitLookup);
    rows = kids.length === 0 ? 1 : sumWithMargin(kids, byParent, unitLookup, cache, visiting);
  } else {
    const { soloA, shared, soloB } = coupleBands(unit.a, unit.b, byParent, unitLookup);
    const bands = [soloA, shared, soloB].filter((band) => band.length > 0);
    const content = bands.reduce(
      (sum, band, index) =>
        sum + sumWithMargin(band, byParent, unitLookup, cache, visiting) + (index > 0 ? SIBLING_MARGIN : 0),
      0,
    );
    rows = Math.max(2, content);
  }

  visiting.delete(key);
  cache.set(key, rows);
  return rows;
}

function sumWithMargin(
  units: Unit[],
  byParent: Map<number, Family[]>,
  unitLookup: Map<number, Unit>,
  cache: Map<string, number>,
  visiting: Set<string>,
): number {
  return units.reduce(
    (sum, unit, index) =>
      sum + requiredRows(unit, byParent, unitLookup, cache, visiting) + (index > 0 ? SIBLING_MARGIN : 0),
    0,
  );
}

// Phase 2 (top-down): each unit is handed a band already reserved by its
// caller and places itself + its children strictly inside it. No clamping,
// no shared cursor — bands are disjoint by construction, so sibling
// subtrees (however unrelated) can never end up sharing a row.
function placeUnits(
  units: Unit[],
  topRow: number,
  byParent: Map<number, Family[]>,
  unitLookup: Map<number, Unit>,
  cache: Map<string, number>,
  rowOf: Map<number, number>,
): void {
  let cursor = topRow;
  for (const unit of units) {
    const size = requiredRows(unit, byParent, unitLookup, cache, new Set());
    placeUnit(unit, cursor, cursor + size, byParent, unitLookup, cache, rowOf);
    cursor += size + SIBLING_MARGIN;
  }
}

function placeUnit(
  unit: Unit,
  topRow: number,
  bottomRow: number,
  byParent: Map<number, Family[]>,
  unitLookup: Map<number, Unit>,
  cache: Map<string, number>,
  rowOf: Map<number, number>,
): void {
  if (unit.kind === "solo") {
    rowOf.set(unit.person.id, (topRow + bottomRow - 1) / 2);
    placeUnits(ownChildUnits(unit.person.id, byParent, unitLookup), topRow, byParent, unitLookup, cache, rowOf);
    return;
  }

  const { a, b } = unit;
  const { soloA, shared, soloB } = coupleBands(a, b, byParent, unitLookup);

  // The couple always renders as exactly 2 adjacent rows, but centered
  // within the full band reserved for the couple + all descendants (mirrors
  // the solo case's "(topRow + bottomRow - 1) / 2" centering, just widened
  // to 2 rows) rather than pinned to the top of it.
  const bandHeight = bottomRow - topRow;
  const pairTop = topRow + (bandHeight - 2) / 2;
  rowOf.set(a.id, pairTop);
  rowOf.set(b.id, pairTop + 1);

  let cursor = topRow;
  for (const band of [soloA, shared, soloB]) {
    if (band.length === 0) continue;
    placeUnits(band, cursor, byParent, unitLookup, cache, rowOf);
    cursor += sumWithMargin(band, byParent, unitLookup, cache, new Set()) + SIBLING_MARGIN;
  }
}

function isUnitPlaced(unit: Unit, rowOf: Map<number, number>): boolean {
  return unit.kind === "solo" ? rowOf.has(unit.person.id) : rowOf.has(unit.a.id) && rowOf.has(unit.b.id);
}

export function computeFamilyTreeLayout(
  people: Person[],
  relationships: Relationship[],
  orientation: TreeOrientation,
): FamilyTreeLayout {
  if (people.length === 0) {
    return { positioned: [], spouseConnectors: [], parentChildConnectors: [], width: 0, height: 0 };
  }

  const generationOf = computeGenerations(people, relationships);
  const families = buildFamilies(people);
  const byParent = familiesByParent(families);
  const unitLookup = buildUnitLookup(people, relationships);
  const cache = new Map<string, number>();
  const rowOf = new Map<number, number>();

  // A unit is a root iff none of its members have any recorded parent — a
  // person with recorded parents (even if their partner has none, e.g. a
  // spouse who "married in" with no ancestry on file) is reached via that
  // parent's own Family traversal instead, so is never double-counted here.
  const nonRootPersonIds = new Set(people.filter((p) => parentsKey(p) !== "").map((p) => p.id));
  function isRootUnit(unit: Unit): boolean {
    return unit.kind === "solo"
      ? !nonRootPersonIds.has(unit.person.id)
      : !nonRootPersonIds.has(unit.a.id) && !nonRootPersonIds.has(unit.b.id);
  }

  const allUnitsByKey = new Map<string, Unit>();
  for (const person of people) {
    const unit: Unit = unitLookup.get(person.id) ?? { kind: "solo", person };
    allUnitsByKey.set(unitKey(unit), unit);
  }
  const allUnits = [...allUnitsByKey.values()];

  const rootUnits = allUnits.filter(isRootUnit).sort((u1, u2) => firstMemberId(u1) - firstMemberId(u2));
  placeUnits(rootUnits, 0, byParent, unitLookup, cache, rowOf);

  // Safety net: a unit never reached from a root (e.g. a subtree with no
  // recorded ancestor at all, or bad/cyclic data) is appended below
  // everything already placed instead of being silently dropped.
  const missingUnits = allUnits
    .filter((unit) => !isUnitPlaced(unit, rowOf))
    .sort((u1, u2) => firstMemberId(u1) - firstMemberId(u2));
  if (missingUnits.length > 0) {
    const placedRows = [...rowOf.values()];
    const startRow = placedRows.length > 0 ? Math.max(...placedRows) + 1 + SIBLING_MARGIN : 0;
    placeUnits(missingUnits, startRow, byParent, unitLookup, cache, rowOf);
  }

  const positioned: PositionedPerson[] = people.map((person) => {
    const generation = generationOf.get(person.id) ?? 0;
    const row = rowOf.get(person.id) ?? 0;
    const x =
      orientation === "horizontal"
        ? generation * (CARD_WIDTH + GENERATION_GAP)
        : row * (CARD_WIDTH + SIBLING_GAP);
    const y =
      orientation === "horizontal"
        ? row * (CARD_HEIGHT + SIBLING_GAP)
        : generation * (CARD_HEIGHT + GENERATION_GAP);
    return { person, x, y, generation };
  });

  const positionById = new Map(positioned.map((p) => [p.person.id, p]));

  const spouseConnectors: SpouseConnector[] = [];
  for (const rel of relationships) {
    const pa = positionById.get(rel.person1Id);
    const pb = positionById.get(rel.person2Id);
    if (!pa || !pb) continue;
    const dashed = rel.type === "Divorced";
    if (orientation === "horizontal") {
      const x = pa.x + CARD_WIDTH / 2;
      spouseConnectors.push({
        key: `spouse-${rel.id}`,
        x1: x,
        y1: Math.min(pa.y, pb.y) + CARD_HEIGHT / 2,
        x2: x,
        y2: Math.max(pa.y, pb.y) + CARD_HEIGHT / 2,
        dashed,
      });
    } else {
      const y = pa.y + CARD_HEIGHT / 2;
      spouseConnectors.push({
        key: `spouse-${rel.id}`,
        x1: Math.min(pa.x, pb.x) + CARD_WIDTH / 2,
        y1: y,
        x2: Math.max(pa.x, pb.x) + CARD_WIDTH / 2,
        y2: y,
        dashed,
      });
    }
  }

  const parentChildConnectors: ParentChildConnector[] = [];
  for (const family of families.values()) {
    const parentPositions = family.parentIds
      .map((id) => positionById.get(id))
      .filter((p): p is PositionedPerson => p != null);
    if (parentPositions.length === 0) continue;

    let originX: number;
    let originY: number;
    if (orientation === "horizontal") {
      originX = parentPositions[0].x + CARD_WIDTH;
      originY =
        parentPositions.length === 2
          ? (parentPositions[0].y + parentPositions[1].y) / 2 + CARD_HEIGHT / 2
          : parentPositions[0].y + CARD_HEIGHT / 2;
    } else {
      originY = parentPositions[0].y + CARD_HEIGHT;
      originX =
        parentPositions.length === 2
          ? (parentPositions[0].x + parentPositions[1].x) / 2 + CARD_WIDTH / 2
          : parentPositions[0].x + CARD_WIDTH / 2;
    }

    for (const child of family.children) {
      const target = positionById.get(child.id);
      if (!target) continue;
      parentChildConnectors.push({
        key: `parent-${family.key}-${child.id}`,
        originX,
        originY,
        targetX: orientation === "horizontal" ? target.x : target.x + CARD_WIDTH / 2,
        targetY: orientation === "horizontal" ? target.y + CARD_HEIGHT / 2 : target.y,
      });
    }
  }

  const width = Math.max(...positioned.map((p) => p.x + CARD_WIDTH));
  const height = Math.max(...positioned.map((p) => p.y + CARD_HEIGHT));

  return { positioned, spouseConnectors, parentChildConnectors, width, height };
}
