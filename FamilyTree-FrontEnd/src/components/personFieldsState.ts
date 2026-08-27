import type { Gender, Person, PersonRequest } from "../api/types";

export interface PersonFieldsState {
  firstName: string;
  lastName: string;
  birthLastName: string;
  gender: Gender | "";
  birthDate: string;
  birthPlace: string;
  dateOfDeath: string;
  deathPlace: string;
  pictureUrl: string;
  biography: string;
  parent1Id: number | null;
  parent2Id: number | null;
}

export const emptyPersonFields: PersonFieldsState = {
  firstName: "",
  lastName: "",
  birthLastName: "",
  gender: "",
  birthDate: "",
  birthPlace: "",
  dateOfDeath: "",
  deathPlace: "",
  pictureUrl: "",
  biography: "",
  parent1Id: null,
  parent2Id: null,
};

export function personToFields(person: Person): PersonFieldsState {
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    birthLastName: person.birthLastName ?? "",
    gender: person.gender ?? "",
    birthDate: person.birthDate ?? "",
    birthPlace: person.birthPlace ?? "",
    dateOfDeath: person.dateOfDeath ?? "",
    deathPlace: person.deathPlace ?? "",
    pictureUrl: person.pictureUrl ?? "",
    biography: person.biography ?? "",
    parent1Id: person.parent1Id,
    parent2Id: person.parent2Id,
  };
}

export function fieldsToRequest(fields: PersonFieldsState): PersonRequest {
  return {
    firstName: fields.firstName,
    lastName: fields.lastName,
    birthLastName: fields.birthLastName.trim() || null,
    gender: fields.gender || null,
    birthDate: fields.birthDate || null,
    birthPlace: fields.birthPlace.trim() || null,
    dateOfDeath: fields.dateOfDeath || null,
    deathPlace: fields.deathPlace.trim() || null,
    pictureUrl: fields.pictureUrl.trim() || null,
    biography: fields.biography.trim() || null,
    parent1Id: fields.parent1Id,
    parent2Id: fields.parent2Id,
  };
}
