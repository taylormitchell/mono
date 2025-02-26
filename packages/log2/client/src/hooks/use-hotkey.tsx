import { useCallback, useEffect } from "react";
import isHotkey from "is-hotkey";

export function useHotkey(key: string, callback: (e: KeyboardEvent) => void, deps: unknown[] = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedCallback = useCallback(callback, deps);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isHotkey(key, e)) {
        memoizedCallback(e);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, memoizedCallback]);
}

export function isEditableElement(element: Element | null) {
  return (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
}
