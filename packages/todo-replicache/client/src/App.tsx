import { useEffect, useState } from "react";
import { createStore, Store } from "./store";
import { StoreContext, useStore } from "./hooks/store";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { ItemPage } from "./pages/ItemPage";
import { isHotkey } from "is-hotkey";
import { ulid } from "ulid";
import { StandardView } from "./pages/StandardView";
import { ChatView } from "./pages/ChatView";
import { cn } from "./lib/utils";

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

function Layout({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const navigate = useNavigate();

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
            onClick={() => navigate("/")}
            className={cn(
              "w-full px-3 py-2 text-left rounded-md",
              location.pathname === "/" ? "bg-[#1f6feb] text-white" : "text-[#c9d1d9] hover:bg-[#21262d]"
            )}
          >
            Standard View
          </button>
          <button
            onClick={() => navigate("/chat")}
            className={cn(
              "w-full px-3 py-2 text-left rounded-md",
              location.pathname === "/chat" ? "bg-[#1f6feb] text-white" : "text-[#c9d1d9] hover:bg-[#21262d]"
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
        <main>{children}</main>
      </div>
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<StandardView />} />
            <Route path="/chat" element={<ChatView />} />
            <Route path="/items/:id" element={<ItemPage />} />
          </Routes>
        </Layout>
      </Router>
    </StoreProvider>
  );
}

export default App;
