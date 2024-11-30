import { createContext, useContext, ReactNode } from "react";
import { Store } from "./store";
import { createStore } from "./models";

const StoreContext = createContext<Store<any> | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = createStore();
  store.pull();
  (window as any).store = store;

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return store;
}
