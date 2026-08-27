const COOKIE_NAME = "familytree_auth_token";
const SESSION_MESSAGE_KEY = "familytree_session_message";

export function setAuthToken(token: string, expiresAtIso: string): void {
  const expires = new Date(expiresAtIso).toUTCString();
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getAuthToken(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function clearAuthToken(): void {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

export function isLoggedIn(): boolean {
  return getAuthToken() !== null;
}

// A one-shot message stashed just before a full page reload (e.g. after a
// session expires) so it can be shown once the page comes back up.
export function setSessionMessage(message: string): void {
  sessionStorage.setItem(SESSION_MESSAGE_KEY, message);
}

export function consumeSessionMessage(): string | null {
  const message = sessionStorage.getItem(SESSION_MESSAGE_KEY);
  if (message) sessionStorage.removeItem(SESSION_MESSAGE_KEY);
  return message;
}
