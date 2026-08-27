import { clearAuthToken } from "./authStorage";
import "./AuthButtons.css";

export function LogoutButton() {
  function handleLogout() {
    clearAuthToken();
    window.location.reload();
  }

  return (
    <button type="button" className="auth-button auth-button--secondary" onClick={handleLogout}>
      Log out
    </button>
  );
}
