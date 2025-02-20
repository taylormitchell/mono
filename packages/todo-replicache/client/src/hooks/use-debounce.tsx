import { useRef, useCallback, useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DebouncedFunction<T extends (...args: any) => any> = T & {
  cancel: () => void;
  runImmediately: T;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebounce<T extends (...args: any) => any>(fn: T, ms: number, deps: unknown[] = []): DebouncedFunction<T> {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => fn(...args), ms);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps, ms]
  ) as DebouncedFunction<T>;

  debouncedFn.cancel = () => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }
  };

  debouncedFn.runImmediately = ((...args) => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }
    return fn(...args);
  }) as T;

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [debouncedFn]);

  return debouncedFn;
}
