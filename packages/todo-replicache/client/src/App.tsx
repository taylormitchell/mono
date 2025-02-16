import { useEffect, useState } from "react";
import { createStore, Store } from "./store";
import { StoreContext, useStore } from "./hooks/store";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { ItemPage } from "./pages/ItemPage";
import { isHotkey } from "is-hotkey";
import { StandardView } from "./pages/StandardView";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
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
  }, [store]);

  return (
    <div className="h-full w-full bg-primary flex relative overflow-hidden">
      {/* Sidebar Toggle Button */}
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="fixed top-0 left-0 z-50 p-2 rounded-md">
        <svg
          className="w-6 h-6 text-primary"
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

      <div
        className={cn(
          "w-48 bg-primary border-primary border-r p-4 fixed min-h-screen z-40 transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="space-y-1 mt-12">
          <button
            onClick={() => {
              navigate("/");
              setIsSidebarOpen(false);
            }}
            className={cn(
              "w-full px-3 py-2 text-left rounded-md",
              location.pathname === "/" ? "bg-accent text-white" : "text-secondary hover-bg"
            )}
          >
            Standard View
          </button>
          <button
            onClick={() => {
              navigate("/logs");
              setIsSidebarOpen(false);
            }}
            className={cn(
              "w-full px-3 py-2 text-left rounded-md",
              location.pathname === "/logs" ? "bg-accent text-white" : "text-secondary hover-bg"
            )}
          >
            Logs
          </button>
          <div className="border-t border-primary my-4" />
          <button
            onClick={() => {
              indexedDB.deleteDatabase(store.rep.idbName);
              window.location.reload();
            }}
            className="w-full px-3 py-2 text-left rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            Reset App
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 z-30" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main content */}
      <div className={cn("h-full w-full transition-all duration-300", isSidebarOpen ? "pl-48" : "pl-0")}>{children}</div>
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
            <Route path="/items/:id" element={<ItemPage />} />
          </Routes>
        </Layout>
      </Router>
    </StoreProvider>
  );
}

export default App;
