import { PUT_HIGHLIGHTS_API_URL } from "./env";
import { updateBadge } from "./helpers";
import type { Annotation, Book } from "./types";

console.log("Kindle Highlights Extractor extension is running!");

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed!!!");
  //   chrome.alarms.create("fetchHighlights", { periodInMinutes: 1 / 6 });
  chrome.alarms.create("checkLoginStatus", { periodInMinutes: 1 });
  //   checkLoginStatus();
  updateBadge();
  getAndPutHighlights();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "fetchHighlights") {
    console.log("Fetching highlights...");
    fetchHighlights();
  } else if (alarm.name === "checkLoginStatus") {
    updateBadge();
  }
});

async function getAndPutHighlights() {
  chrome.storage.local.get("token", async (data) => {
    if (!data.token) {
      console.error("No token found");
      return;
    }
    const highlights = await fetchHighlights();
    await putHighlights(highlights, data.token);
  });
}

async function fetchHighlights(): Promise<Annotation[]> {
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({ domain: "read.amazon.com" }, async (cookies) => {
      const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

      const response = await fetch("https://read.amazon.com/notebook", {
        method: "GET",
        headers: {
          Cookie: cookieHeader,
        },
        credentials: "include",
      });
      const html = await response.text();
      const books = await fetchFromOffscreenDocument<Book[]>({
        type: "get-books",
        data: { html },
      });

      const bookAnnotations = (
        await Promise.all(
          books.map(async (book) => {
            console.debug("fetching", book);
            const response = await fetch(
              `https://read.amazon.com/notebook?asin=${book.asin}&contentLimitState=&`,
              {
                method: "GET",
                headers: {
                  Cookie: cookieHeader,
                },
                credentials: "include",
              }
            );
            const html = await response.text();
            console.debug("getting annotations for", book.asin);
            const annotations = await fetchFromOffscreenDocument<Annotation[]>({
              type: "get-annotations",
              data: { html },
            });
            return annotations.map((annotation) => ({ ...annotation, ...book }));
          })
        )
      )
        .flat()
        .sort((a, b) => {
          if (a.asin < b.asin) return -1;
          if (a.asin > b.asin) return 1;
          if (a.id < b.id) return -1;
          if (a.id > b.id) return 1;
          return 0;
        });

      resolve(bookAnnotations);
    });
  });
}

async function putHighlights(highlights: Annotation[], token: string) {
  try {
    const content = JSON.stringify({ highlights }, null, 2);
    const response = await fetch(PUT_HIGHLIGHTS_API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });
    if (response.ok) {
      const data = await response.json();
      console.log("put highlights request succeeded", { responseData: data });
    } else {
      throw new Error(`Request not ok: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error putting highlights", { error });
  }
}

async function fetchFromOffscreenDocument<T>({
  type,
  data,
}: {
  type: string;
  data: any;
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
  chrome.runtime.sendMessage({ type, messageId, data });
  return new Promise((resolve) => {
    const listener = (message: any) => {
      if (message.messageId === messageId) {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message.data);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
  });
}
