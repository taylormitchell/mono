import { env } from "./env";
import { Replicache } from "replicache";
import { atom, getDefaultStore } from "jotai";
import { mutators } from "./mutators";

// Set up Replicache
export const rep = new Replicache({
  name: "taylormitchell",
  licenseKey: env.replicacheLicenseKey,
  pullURL: env.replicachePullURL,
  pushURL: env.replicachePushURL,
  pushDelay: 5000,
  mutators,
  logLevel: "debug",
});

if (env.replicachePokeURL) {
  const ws = new WebSocket(env.replicachePokeURL);
  ws.onmessage = () => {
    console.debug("Pulling in response to poke");
    rep.pull();
  };
  window.addEventListener("beforeunload", () => ws.close());
}
// Set up view state
const viewStateAtom = atom<{ id: string }>({ id: "" });
export const isFocused = (id: string | undefined) => {
  return getDefaultStore().get(viewStateAtom).id === id;
};
export const setFocus = (id: string | null) => {
  getDefaultStore().set(viewStateAtom, { id: id || "" });
};
// Expose some stuff for debugging
const w = window as any;
w.rep = rep;
w.getViewState = () => getDefaultStore().get(viewStateAtom);
w.getRepState = async () => {
  return rep.query((tx) => tx.scan().entries().toArray());
};
