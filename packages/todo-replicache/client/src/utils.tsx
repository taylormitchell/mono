import { useRef, useCallback, useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebounce(fn: (...args: any[]) => void, deps: any[], ms: number) {
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
