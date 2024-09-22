// background.js

console.log("Kindle Highlights Extractor extension is running!");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed.");
  //   chrome.alarms.create("fetchHighlights", { periodInMinutes: 1 / 6 });
  fetchHighlights();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "fetchHighlights") {
    fetchHighlights();
  }
});

function fetchHighlights() {
  // Get cookies for read.amazon.com
  console.log("Fetching highlights...");
  chrome.cookies.getAll({ domain: "read.amazon.com" }, (cookies) => {
    const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

    fetch("https://read.amazon.com/notebook", {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
      },
      credentials: "include",
    })
      .then((response) => response.text())
      .then((data) => {
        console.log(data);
        const highlights = parseHighlights(data);
        console.log(highlights);
      })
      .catch((error) => {
        console.error("Error fetching highlights:", error);
      });
  });
}

function parseHighlights(htmlText) {
  const highlights = [];
  const regex = /<div class="kp-notebook-highlight">([\s\S]*?)<\/div>/g;
  let match;

  while ((match = regex.exec(htmlText)) !== null) {
    const highlightHtml = match[1];
    const bookTitleMatch = highlightHtml.match(/<div class="kp-notebook-metadata">(.*?)<\/div>/);
    const highlightTextMatch = highlightHtml.match(/<span id="highlight">(.*?)<\/span>/);

    if (bookTitleMatch && highlightTextMatch) {
      highlights.push({
        book: bookTitleMatch[1].trim(),
        text: highlightTextMatch[1].trim(),
      });
    }
  }

  return highlights;
}

// Run this to clear the alarm
// chrome.alarms.clear("fetchHighlights", (wasCleared) => {
//     console.log(wasCleared ? "Alarm cleared successfully" : "No alarm to clear");
//   });
