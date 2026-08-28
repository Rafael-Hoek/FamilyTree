import { useCallback, useEffect, useState } from "react";
import { getPeople, getRelationships } from "./api/client";
import type { Person, Relationship } from "./api/types";
import { AddFamilyMemberButton } from "./addPerson/AddFamilyMemberButton";
import { consumeSessionMessage, isLoggedIn as checkIsLoggedIn } from "./auth/authStorage";
import { LoginButton } from "./auth/LoginButton";
import { LogoutButton } from "./auth/LogoutButton";
import { FamilyTreeView } from "./familyTree/FamilyTreeView";
import { PersonDetailModal } from "./personDetail/PersonDetailModal";
import "./App.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; people: Person[]; relationships: Relationship[] };

function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [loggedIn, setLoggedIn] = useState(() => checkIsLoggedIn());
  const [sessionMessage, setSessionMessageState] = useState<string | null>(() => consumeSessionMessage());

  const load = useCallback(async () => {
    try {
      const [people, relationships] = await Promise.all([getPeople(), getRelationships()]);
      setState({ status: "ready", people, relationships });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load family tree data.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const people = state.status === "ready" ? state.people : [];
  const relationships = state.status === "ready" ? state.relationships : [];
  const selectedPerson = selectedPersonId != null ? (people.find((p) => p.id === selectedPersonId) ?? null) : null;

  return (
    <div className="app">
      <h1>Family Tree</h1>

      <div className="top-left-controls">
        {loggedIn ? (
          <>
            <AddFamilyMemberButton
              people={people}
              onPersonAdded={() => {
                void load();
              }}
            />
            <LogoutButton />
          </>
        ) : (
          <LoginButton
            onLoggedIn={() => {
              setLoggedIn(true);
              setSessionMessageState(null);
            }}
          />
        )}
      </div>

      {sessionMessage && (
        <div className="session-message" role="alert">
          {sessionMessage}
          <button type="button" onClick={() => setSessionMessageState(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <div className="app__body">
        {state.status === "loading" && <p>Loading…</p>}
        {state.status === "error" && (
          <p role="alert">Could not load the family tree: {state.message}</p>
        )}
        {state.status === "ready" && (
          <FamilyTreeView people={people} relationships={relationships} onSelectPerson={setSelectedPersonId} />
        )}
      </div>
      {selectedPerson && (
        <PersonDetailModal
          key={selectedPerson.id}
          person={selectedPerson}
          people={people}
          relationships={relationships}
          isLoggedIn={loggedIn}
          onClose={() => setSelectedPersonId(null)}
          onChanged={() => {
            void load();
          }}
        />
      )}
    </div>
  );
}

export default App;
