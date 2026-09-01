import type { TreeOrientation } from "./computeLayout";

const ORIENTATION_KEY = "familytree_orientation";

export function getStoredOrientation(): TreeOrientation {
  return localStorage.getItem(ORIENTATION_KEY) === "vertical" ? "vertical" : "horizontal";
}

export function setStoredOrientation(orientation: TreeOrientation): void {
  localStorage.setItem(ORIENTATION_KEY, orientation);
}
