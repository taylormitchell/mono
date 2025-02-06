import { useEffect, useState } from "react";
import { createStore, Store } from "./store";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { StoreContext, useStore } from "./hooks/store";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ItemPage } from "./pages/ItemPage";
import { StandardView } from "./pages/StandardView";
import { ChatView } from "./pages/ChatView";
import { isHotkey } from "is-hotkey";
import { ulid } from "ulid";

declare global {
  interface Window {
    store: Store | null;
  }
}

function StoreProvider({ children }: { children: React.ReactNode }) {
  const [{ isLoading, store }, setStore] = useState<
    { isLoading: true; store: null } | { isLoading: false; store: Store }
  >({
    isLoading: true,
    store: null,
  });

  useEffect(() => {
    const s = createStore();
    s.rep.pull();
    window.store = s;
    setStore({ isLoading: false, store: s });
    return () => {
      // s.destroy();
      window.store = null;
    };
  }, []);

  if (isLoading) return null;
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

function cn(...args: (string | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}

type ViewMode = "standard" | "chat";
const viewModeAtom = atomWithStorage<ViewMode>("viewMode", "standard");

function ItemApp() {
  const store = useStore();
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Move keyboard shortcut handler here
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (isHotkey("n", e) && !editingId && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        e.stopPropagation();
        const id = ulid();
        await store.items.create({ id, content: "" });
        setEditingId(id);
      }
      if (isHotkey("escape", e) && editingId) {
        e.preventDefault();
        e.stopPropagation();
        setEditingId(null);
      }
      if (isHotkey("cmd+z", e)) {
        e.preventDefault();
        e.stopPropagation();
        store.undo();
      }
      if (isHotkey("cmd+shift+z", e)) {
        e.preventDefault();
        e.stopPropagation();
        store.redo();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [store, editingId]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex">
      {/* Sidebar */}
      <div className="w-48 border-r border-[#30363d] p-4">
        <div className="space-y-1">
          <button
            onClick={() => setViewMode("standard")}
            className={cn(
              "w-full px-3 py-2 text-left rounded-md",
              viewMode === "standard" ? "bg-[#1f6feb] text-white" : "text-[#c9d1d9] hover:bg-[#21262d]"
            )}
          >
            Standard View
          </button>
          <button
            onClick={() => setViewMode("chat")}
            className={cn(
              "w-full px-3 py-2 text-left rounded-md",
              viewMode === "chat" ? "bg-[#1f6feb] text-white" : "text-[#c9d1d9] hover:bg-[#21262d]"
            )}
          >
            Chat View
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen">
        <header className="py-4 flex items-center justify-between border-b border-[#30363d] px-4">
          <button
            onClick={() => store.items.create({ content: "" })}
            className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md text-sm font-semibold"
          >
            New Item
          </button>
          <button
            onClick={() => {
              indexedDB.deleteDatabase(store.rep.idbName);
              window.location.reload();
            }}
            className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md text-sm font-semibold"
          >
            Reset
          </button>
        </header>

        <div className="flex-1 overflow-hidden p-4">{viewMode === "standard" ? <StandardView /> : <ChatView />}</div>
      </div>
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ItemApp />} />
          <Route path="/items/:id" element={<ItemPage />} />
        </Routes>
      </Router>
    </StoreProvider>
  );
}

export default App;
