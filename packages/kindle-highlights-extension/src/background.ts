console.log("Kindle Highlights Extractor extension is running!");

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed!!!");
  //   chrome.alarms.create("fetchHighlights", { periodInMinutes: 1 / 6 });
  //   fetchHighlights();
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
    const asins = await sendMessageToOffscreenDocument({ type: "get-asins", data: { html } });

    const bookAnnotations: { asin: string; html: string; annotations: any[] }[] = await Promise.all(
      asins.map(async (asin) => {
        console.log("fetching", asin);
        const response = await fetch(
          `https://read.amazon.com/notebook?asin=${asin}&contentLimitState=&`,
          {
            method: "GET",
            headers: {
              Cookie: cookieHeader,
            },
            credentials: "include",
          }
        );
        const html = await response.text();
        console.log("getting annotations for", asin);
        return {
          asin,
          html,
          annotations: sendMessageToOffscreenDocument({ type: "get-annotations", data: { html } }),
        };
      })
    );

    console.log(bookAnnotations);
  });
}

async function sendMessageToOffscreenDocument({ type, data }: { type: string; data: any }) {
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
    target: "offscreen",
    data,
  });
  return new Promise((resolve) => {
    const listener = (message: any) => {
      if (message.messageId === messageId && message.target === "background") {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message.data);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
  });
}
