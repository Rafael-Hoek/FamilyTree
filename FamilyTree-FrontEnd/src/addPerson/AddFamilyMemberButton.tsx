import { useEffect, useState } from "react";
import type { Person } from "../api/types";
import { AddPersonForm } from "./AddPersonForm";
import "../components/Modal.css";
import "../auth/AuthButtons.css";

interface AddFamilyMemberButtonProps {
  people: Person[];
  onPersonAdded: () => void;
}

export function AddFamilyMemberButton({ people, onPersonAdded }: AddFamilyMemberButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button type="button" className="auth-button" onClick={() => setIsOpen(true)}>
        Add family member
      </button>
      {isOpen && (
        <div className="modal-backdrop" onClick={() => setIsOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <AddPersonForm people={people} onCreated={onPersonAdded} onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
