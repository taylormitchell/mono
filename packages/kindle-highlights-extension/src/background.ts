import { PUT_HIGHLIGHTS_API_URL } from "./env";
import { renderBadge, syncInterval } from "./shared";
import type { Annotation, Book } from "./shared";

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Kindle Highlights Extractor extension is running");
  chrome.storage.local.set({ startedAt: new Date().toISOString() });
  chrome.alarms.create("syncHighlights", { periodInMinutes: syncInterval });
  chrome.alarms.create("checkLoginStatus", { periodInMinutes: 60 });
  fetchHighlights();
  renderBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncHighlights") {
    fetchHighlights();
  } else if (alarm.name === "checkLoginStatus") {
    renderBadge();
  }
});

async function fetchHighlights(): Promise<void> {
  console.log("Fetching annotations");
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ lastSyncTime: new Date().toISOString() });
    // Load auth token
    chrome.storage.local.get("token", async (data) => {
      if (!data.token) {
        return reject(new Error("No token found"));
      }
      // Get list of books
      console.debug("Getting books");
      const booksResponse = await fetch("https://read.amazon.com/notebook", { method: "GET" });
      const html = await booksResponse.text();
      const books = await parseHtml<Book[]>({ type: "get-books", html });

      // Get annotations for each book
      console.debug("Getting all annotations");
      const bookAnnotations = (
        await Promise.all(
          books.map(async (book) => {
            const response = await fetch(
              `https://read.amazon.com/notebook?asin=${book.asin}&contentLimitState=&`,
              {
                method: "GET",
              }
            );
            const html = await response.text();
            const annotations = await parseHtml<Annotation[]>({ type: "get-annotations", html });
            return annotations.map((annotation) => ({ ...annotation, ...book }));
          })
        )
      )
        .flat()
        .sort((a, b) => {
          // sort by asin then id
          if (a.asin < b.asin) return -1;
          if (a.asin > b.asin) return 1;
          if (a.id < b.id) return -1;
          if (a.id > b.id) return 1;
          return 0;
        });

      // Save annotations
      console.debug("Saving annotations", { count: bookAnnotations.length });
      const content = JSON.stringify({ highlights: bookAnnotations }, null, 2);
      const putResponse = await fetch(PUT_HIGHLIGHTS_API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.token}`,
        },
        body: JSON.stringify({ content }),
      });
      if (putResponse.ok) {
        const data = await putResponse.json();
        console.debug("put response:", data);
        console.log("Annotations saved");
        resolve();
      } else {
        reject(new Error(`Request not ok: ${putResponse.status} ${putResponse.statusText}`));
      }
    });
  });
}

async function parseHtml<T>({
  type,
  html,
  timeout = 10000,
}: {
  type: string;
  html: string;
  timeout?: number;
}): Promise<T> {
  const hasOffscreen = await chrome.offscreen.hasDocument();
  if (!hasOffscreen) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: "Parse DOM",
    });
  }
  const messageId = Math.random();
  chrome.runtime.sendMessage({ type, messageId, data: { html } });
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);

    const listener = (message: any) => {
      if (message.messageId === messageId) {
        clearTimeout(timeoutId);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message.data);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
  });
}
