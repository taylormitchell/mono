import { useRef, useCallback, useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebounce<T extends (...args: any[]) => void>(fn: T, ms: number, deps: any[]) {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFn = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) => {
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => fn(...args), ms);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps, ms]
  );

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [debouncedFn]);

  return debouncedFn;
}
