import { useEffect, useState } from "react";
import { createStore, Store } from "./store";
import { StoreContext } from "./hooks/store";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { isHotkey } from "is-hotkey";
import { Home } from "./pages/home";
import { LogEdit } from "./pages/edit";

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
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (isHotkey("cmd+z", e)) {
        e.preventDefault();
        e.stopPropagation();
        s.undo();
      }
      if (isHotkey("cmd+shift+z", e)) {
        e.preventDefault();
        e.stopPropagation();
        s.redo();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      // s.destroy();
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  if (isLoading) return null;
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

function App() {
  return (
    <StoreProvider>
      <div className="h-full w-full bg-[var(--bg-primary)] flex relative overflow-hidden">
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/edit/:id" element={<LogEdit />} />
          </Routes>
        </Router>
      </div>
    </StoreProvider>
  );
}

export default App;
