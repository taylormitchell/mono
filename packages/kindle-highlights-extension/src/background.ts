import type { Annotation, Book } from "./types";

console.log("Kindle Highlights Extractor extension is running!");

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed!!!");
  //   chrome.alarms.create("fetchHighlights", { periodInMinutes: 1 / 6 });
  fetchHighlights();
});

// chrome.alarms.onAlarm.addListener((alarm) => {
//   if (alarm.name === "fetchHighlights") {
//     console.log("Fetching highlights...");
//     fetchHighlights();
//   }
// });

async function fetchHighlights() {
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
        books.slice(0, 2).map(async (book) => {
          console.log("fetching", book);
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
          console.log("getting annotations for", book.asin);
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

    console.log(bookAnnotations);
  });
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
  chrome.runtime.sendMessage({
    type,
    messageId,
    data,
  });
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
