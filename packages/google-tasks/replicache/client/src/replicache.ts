import { Replicache } from 'replicache';

const licenseKey = import.meta.env.VITE_REPLICACHE_LICENSE_KEY;
if (!licenseKey) {
  throw new Error("VITE_REPLICACHE_LICENSE_KEY is not set");
}

export const rep = new Replicache({
  name: "gtasks",
  pushURL: "http://localhost:3001/push", // not yet implemented
  pullURL: "http://localhost:3001/pull", // implemented
  pullInterval: 60_000,
  mutators: {},
  licenseKey,
});