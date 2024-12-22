import { useEffect } from "react";
import isHotkey from "is-hotkey";

export function useKeyDown(key: string, callback: (e: KeyboardEvent) => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isHotkey(key, e)) {
        callback(e);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [key, callback]);
}
