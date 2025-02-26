import { useEffect, useState } from "react";
import { createStore, Store } from "./store";
import { StoreContext } from "./hooks/store";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { isHotkey } from "is-hotkey";
import { Home } from "./pages/home";
import { LogEdit } from "./pages/edit";
import { PromptEdit } from "./pages/prompt";
import { useSseEvents } from "./hooks/use-sse-events";
import { ToastContainer } from "./components/toast-container";
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

  useSseEvents(
    (message) => {
      if (!store) return;
      if (message.type === "poke") {
        store.rep.pull();
      }
    },
    [store]
  );

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
            <Route path="/prompt" element={<PromptEdit />} />
          </Routes>
        </Router>
      </div>
      <ToastContainer />
    </StoreProvider>
  );
}

export default App;
