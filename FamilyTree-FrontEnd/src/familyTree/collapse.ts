import type { Person, Relationship } from "../api/types";

/**
 * Given a set of "collapsed" person ids, returns the full set of person ids
 * that should be hidden: every descendant of a collapsed person (following
 * parent1Id/parent2Id recursively), plus each hidden person's spouse (so a
 * couple's card never gets split — one visible, one not).
 */
export function computeHiddenPersonIds(
  collapsedIds: ReadonlySet<number>,
  people: Person[],
  relationships: Relationship[],
): Set<number> {
  const childrenOf = new Map<number, number[]>();
  for (const person of people) {
    for (const parentId of [person.parent1Id, person.parent2Id]) {
      if (parentId == null) continue;
      if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
      childrenOf.get(parentId)!.push(person.id);
    }
  }

  const spouseOf = new Map<number, number[]>();
  for (const rel of relationships) {
    if (!spouseOf.has(rel.person1Id)) spouseOf.set(rel.person1Id, []);
    spouseOf.get(rel.person1Id)!.push(rel.person2Id);
    if (!spouseOf.has(rel.person2Id)) spouseOf.set(rel.person2Id, []);
    spouseOf.get(rel.person2Id)!.push(rel.person1Id);
  }

  const hidden = new Set<number>();
  const queue: number[] = [];

  for (const collapsedId of collapsedIds) {
    for (const childId of childrenOf.get(collapsedId) ?? []) {
      if (!hidden.has(childId)) {
        hidden.add(childId);
        queue.push(childId);
      }
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbours = [...(childrenOf.get(current) ?? []), ...(spouseOf.get(current) ?? [])];
    for (const neighbourId of neighbours) {
      if (!hidden.has(neighbourId)) {
        hidden.add(neighbourId);
        queue.push(neighbourId);
      }
    }
  }

  return hidden;
}

/** Person ids that have at least one recorded child — only these get a collapse arrow. */
export function computePersonIdsWithChildren(people: Person[]): Set<number> {
  const withChildren = new Set<number>();
  for (const person of people) {
    if (person.parent1Id != null) withChildren.add(person.parent1Id);
    if (person.parent2Id != null) withChildren.add(person.parent2Id);
  }
  return withChildren;
}
