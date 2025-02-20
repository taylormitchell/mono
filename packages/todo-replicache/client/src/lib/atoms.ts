import { atomWithStorage } from "jotai/utils";

export const sidebarAtom = atomWithStorage("sidebar-open", false);
export const featureFlagsAtom = atomWithStorage("feature-flags", {
  vimMode: false,
});
