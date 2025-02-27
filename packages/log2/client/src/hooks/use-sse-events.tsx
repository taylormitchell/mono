import { sseMessageSchema, type SSEMessage } from "../../../shared/types";
import { useCallback, useEffect } from "react";

let apiUrl = import.meta.env.VITE_API_URL || "";
if (!apiUrl.match(/^https?:\/\//)) {
  apiUrl = window.location.origin + apiUrl;
}
const sseUrl = apiUrl + "/api/events";

export function useSseEvents(callback: (message: SSEMessage) => void, deps: unknown[] = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedCallback = useCallback(callback, deps);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    function connect() {
      console.log("Connecting to SSE at", sseUrl);
      eventSource = new EventSource(sseUrl);

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
