export type Gender = "Male" | "Female" | "Other" | "Unknown";

export type RelationshipType =
  | "Married"
  | "Partnered"
  | "Divorced"
  | "Widowed"
  | "Unknown";

export interface Person {
  id: number;
  firstName: string;
  lastName: string;
  birthLastName: string | null;
  gender: Gender | null;
  birthDate: string | null;
  birthPlace: string | null;
  dateOfDeath: string | null;
  deathPlace: string | null;
  pictureUrl: string | null;
  biography: string | null;
  parent1Id: number | null;
  parent2Id: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id: number;
  person1Id: number;
  person2Id: number;
  type: RelationshipType;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonRequest {
  firstName: string;
  lastName: string;
  birthLastName: string | null;
  gender: Gender | null;
  birthDate: string | null;
  birthPlace: string | null;
  dateOfDeath: string | null;
  deathPlace: string | null;
  pictureUrl: string | null;
  biography: string | null;
  parent1Id: number | null;
  parent2Id: number | null;
}

export interface RelationshipRequest {
  person1Id: number;
  person2Id: number;
  type: RelationshipType;
  startDate: string | null;
  endDate: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
}
