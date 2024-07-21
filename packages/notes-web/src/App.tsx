import "./App.css";
import { useSubscribe } from "replicache-react";
import { Note } from "./types";
import { selectors } from "./mutators";
import { nanoid } from "nanoid";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { ProsemirrorMarkdownEditor } from "./ProsemirrorMarkdownEditor";
import { rep, setFocus, isFocused } from "./state";

function App() {
  // Subscribe to the list of note IDs, sorted by creation date. We don't query the full
  // notes here, because if we did, the whole list would re-render on every note content change.
  const [limit, setLimit] = useState(20);
  const noteIds = useSubscribe(
    rep,
    async (tx) => {
      let arr = (await tx.scan({ prefix: "note/" }).values().toArray()) as Note[];
      arr = arr.filter((n) => !n.deletedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return arr.slice(0, limit).map((n) => n.id);
    },
    { default: [] as string[], dependencies: [limit] }
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        padding: "1em 1em 10em",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => {
            const id = nanoid();
            rep.mutate.putNote({
              id,
              title: null,
              body: "",
              createdAt: new Date().toISOString(),
              deletedAt: null,
            });
            console.log("Created note", id);
            setFocus(id);
          }}
        >
          new note
        </button>
        <button
          onClick={() => {
            console.debug("Pulling in response to button click");
            rep.pull();
          }}
        >
          Pull
        </button>
        <button
          onClick={() => {
            console.debug("Pushing in response to button click");
            rep.push();
          }}
        >
          Push
        </button>
      </div>
      <div>
        {noteIds.map((id) => (
          <Editor key={id} noteId={id} />
        ))}
      </div>
      <button onClick={() => setLimit((l) => l + 20)}>Load more</button>
    </div>
  );
}

function Editor({ noteId }: { noteId: string }) {
  const note = useSubscribe(rep, (tx) => selectors.getNote(tx, noteId));
  const debouncedUpdateNote = useDebouncedCallback((body: string) => {
    console.debug("Updating note", { noteId, body });
    rep.mutate.updateNote({ id: noteId, body });
  }, 1000);

  if (!note) {
    return null;
  }
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
      }}
    >
      <ProsemirrorMarkdownEditor
        style={{
          flexGrow: 1,
          fontSize: "1.2em",
          textAlign: "left",
        }}
        value={note?.body || ""}
        onChange={(value) => {
          debouncedUpdateNote(value);
        }}
        autoFocus={isFocused(noteId)}
        onFocus={() => {
          if (!isFocused(noteId)) {
            setFocus(noteId);
          }
        }}
        onBlur={() => {
          if (isFocused(noteId)) {
            setFocus(null);
          }
        }}
      />
      <button
        onClick={() => rep.mutate.updateNote({ id: noteId, deletedAt: new Date().toISOString() })}
      >
        x
      </button>
    </div>
  );
}

export default App;
