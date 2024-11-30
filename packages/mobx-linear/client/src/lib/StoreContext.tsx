import { createContext } from "react";
import { createStore } from "./models";

const store = createStore();

export const StoreContext = createContext(store);
