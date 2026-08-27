import { clearAuthToken, getAuthToken, setSessionMessage } from "../auth/authStorage";
import type {
  CreateUserRequest,
  LoginRequest,
  LoginResponse,
  Person,
  PersonRequest,
  Relationship,
  RelationshipRequest,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string[]> | null;

  constructor(message: string, status: number, fieldErrors: Record<string, string[]> | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let fieldErrors: Record<string, string[]> | null = null;
  let message = `Request failed with status ${response.status}`;
  try {
    const body = (await response.json()) as { title?: string; errors?: Record<string, string[]> };
    if (body.errors) fieldErrors = body.errors;
    if (body.title) message = body.title;
  } catch {
    // Response had no JSON body — fall back to the generic message above.
  }
  return new ApiError(message, response.status, fieldErrors);
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// A 401 on an authenticated request means the session is gone (missing,
// tampered with, or expired) — clear it and reload back to a clean home page,
// stashing a one-shot message the fresh load will display.
function handleUnauthorized(): void {
  clearAuthToken();
  setSessionMessage("Your session has expired. Please log in again.");
  window.location.reload();
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders() });
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw await toApiError(response);
  }
  return (await response.json()) as T;
}

async function sendJson<T>(path: string, method: "POST" | "PUT", body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw await toApiError(response);
  }
  return (await response.json()) as T;
}

async function deleteRequest(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, { method: "DELETE", headers: authHeaders() });
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw await toApiError(response);
  }
}

export function getPeople(): Promise<Person[]> {
  return getJson<Person[]>("/api/people");
}

export function getRelationships(): Promise<Relationship[]> {
  return getJson<Relationship[]>("/api/relationships");
}

export function createPerson(request: PersonRequest): Promise<Person> {
  return sendJson<Person>("/api/people", "POST", request);
}

export function updatePerson(id: number, request: PersonRequest): Promise<Person> {
  return sendJson<Person>(`/api/people/${id}`, "PUT", request);
}

export function deletePerson(id: number): Promise<void> {
  return deleteRequest(`/api/people/${id}`);
}

export function createRelationship(request: RelationshipRequest): Promise<Relationship> {
  return sendJson<Relationship>("/api/relationships", "POST", request);
}

export function updateRelationship(id: number, request: RelationshipRequest): Promise<Relationship> {
  return sendJson<Relationship>(`/api/relationships/${id}`, "PUT", request);
}

export function deleteRelationship(id: number): Promise<void> {
  return deleteRequest(`/api/relationships/${id}`);
}

// Deliberately bypasses the shared 401 handling above: a rejected login is a
// normal "wrong password" outcome the login form handles inline, not a dead session.
export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as LoginResponse;
}

export async function createUser(request: CreateUserRequest): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw await toApiError(response);
  }
}
