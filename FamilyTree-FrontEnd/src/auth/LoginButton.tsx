import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError, login } from "../api/client";
import { setAuthToken } from "./authStorage";
import "../components/Modal.css";
import "./AuthButtons.css";

interface LoginButtonProps {
  onLoggedIn: () => void;
}

export function LoginButton({ onLoggedIn }: LoginButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await login({ username, password });
      setAuthToken(result.token, result.expiresAt);
      setIsOpen(false);
      setUsername("");
      setPassword("");
      onLoggedIn();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Invalid username or password."
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" className="auth-button" onClick={() => setIsOpen(true)}>
        Log in
      </button>
      {isOpen && (
        <div className="modal-backdrop" onClick={() => setIsOpen(false)}>
          <div className="modal-panel auth-modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <h2>Log in</h2>
              {error && (
                <p className="auth-modal__error" role="alert">
                  {error}
                </p>
              )}
              <label>
                Username
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              <div className="auth-modal__actions">
                <button type="button" onClick={() => setIsOpen(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}>
                  {submitting ? "Logging in…" : "Log in"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
