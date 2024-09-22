import { getAsins, getAnnotations } from "./parsers";

console.log("Kindle Highlights Extractor extension is running!");

chrome.runtime.onInstalled.addListener(() => {
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
    const asins = getAsins(html);

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
        return { asin, html, annotations: getAnnotations(html) };
      })
    );

    console.log(bookAnnotations);
  });
}
