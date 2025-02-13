import { useEffect, useState } from "react";
import { createStore, Store } from "./store";
import { StoreContext, useStore } from "./hooks/store";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { isHotkey } from "is-hotkey";
import { StandardView } from "./pages/StandardView";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    <div className="h-full w-full bg-[var(--bg-primary)] flex relative overflow-hidden">
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
          </Routes>
        </Layout>
      </Router>
    </StoreProvider>
  );
}

export default App;
