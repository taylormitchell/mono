import { useEffect, useState } from "react";
import { createStore, Store } from "./store";
import { StoreContext, useStore } from "./hooks/store";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { ItemPage } from "./pages/item-page";
import { StandardView } from "./pages/standard-view";
import { SettingsPage } from "./pages/settings";
import { isHotkey } from "is-hotkey";

import { cn } from "./lib/utils";
import { Sidebar, SidebarClose } from "lucide-react";
import { SyncIndicator } from "./components/sync-indicator";
import { useAtom } from "jotai";
import { sidebarAtom } from "./lib/atoms";
import { CommandBar } from "./components/command-bar";

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
  const [isSidebarOpen, setIsSidebarOpen] = useAtom(sidebarAtom);
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
      <CommandBar />
      {/* Sidebar Toggle Button */}
      <div className="fixed top-0 left-0 z-50 p-2 rounded-md flex items-center gap-2">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <SidebarClose size={24} /> : <Sidebar size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 w-48 bg-primary border-primary border-r p-4 min-h-screen z-40 transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="space-y-1 mt-12">
          <SyncIndicator />
          <button
            onClick={() => {
              store.items.create({ content: "" });
              setIsSidebarOpen(false);
            }}
            className={"w-full px-3 py-2 text-left rounded-md text-secondary"}
          >
            New Item
          </button>
          <button
            onClick={() => {
              navigate("/");
              setIsSidebarOpen(false);
            }}
            className={"w-full px-3 py-2 text-left rounded-md text-secondary"}
          >
            Home
          </button>
          <div className="border-t border-primary my-4" />
          <button
            onClick={() => {
              navigate("/settings");
              setIsSidebarOpen(false);
            }}
            className={"w-full px-3 py-2 text-left rounded-md text-secondary"}
          >
            Settings
          </button>
          <button
            onClick={() => {
              store.rep.pull();
              setIsSidebarOpen(false);
            }}
            className={"w-full px-3 py-2 text-left rounded-md text-secondary"}
          >
            Sync
          </button>
          <button
            onClick={() => {
              indexedDB.deleteDatabase(store.rep.idbName);
              window.location.reload();
            }}
            className={"w-full px-3 py-2 text-left rounded-md text-secondary"}
          >
            Reset App
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 z-30" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main content*/}
      <div className="h-full w-full">{children}</div>
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
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </Router>
    </StoreProvider>
  );
}

export default App;
