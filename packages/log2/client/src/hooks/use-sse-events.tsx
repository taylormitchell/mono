import { sseMessageSchema } from "../../../shared/types";
import { useCallback } from "react";
import { useEffect } from "react";
import { SSEMessage } from "../../../shared/types";

export function useSseEvents(callback: (message: SSEMessage) => void, deps: unknown[] = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedCallback = useCallback(callback, deps);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    function connect() {
      const serverUrl = import.meta.env.DEV
        ? "http://localhost:3078/api/events" // Development server URL
        : "/api/events";

      eventSource = new EventSource(serverUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = sseMessageSchema.parse(JSON.parse(event.data));
          memoizedCallback(data);
        } catch (e) {
          console.error("Error parsing SSE event", e);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        eventSource?.close();
        connect();
      };
    }

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [memoizedCallback]);
}
