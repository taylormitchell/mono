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
  const [{ isLoading, store }, setStore] = useState<{ isLoading: true; store: null } | { isLoading: false; store: Store }>({
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    <div className="h-full w-full bg-[var(--bg-primary)] flex relative overflow-hidden">
      {/* Sidebar Toggle Button for Mobile */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[#1f6feb] rounded-md"
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isSidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          "w-48 border-r border-[#30363d] p-4 fixed md:static min-h-screen z-40 transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="space-y-1 mt-12 md:mt-0">
          <button
            onClick={() => {
              navigate("/");
              setIsSidebarOpen(false);
            }}
            className={cn(
              "w-full px-3 py-2 text-left rounded-md",
              location.pathname === "/"
                ? "bg-[var(--accent-color)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--hover-color)]"
            )}
          >
            Standard View
          </button>
          <button
            onClick={() => {
              navigate("/chat");
              setIsSidebarOpen(false);
            }}
            className={cn(
              "w-full px-3 py-2 text-left rounded-md",
              location.pathname === "/chat"
                ? "bg-[var(--accent-color)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--hover-color)]"
            )}
          >
            Chat View
          </button>
          <div className="border-t border-[#30363d] my-4" />
          <button
            onClick={() => {
              indexedDB.deleteDatabase(store.rep.idbName);
              window.location.reload();
            }}
            className="w-full px-3 py-2 text-left rounded-md text-[#c9d1d9] hover:bg-red-700 bg-red-600"
          >
            Reset App
          </button>
        </div>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen w-full">
        <main className="flex-1 overflow-auto p-4">{children}</main>
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
