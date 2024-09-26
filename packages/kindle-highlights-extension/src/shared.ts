export function updateBadge() {
  chrome.storage.local.get("token", (result) => {
    if (result.token) {
      console.log("Token found. Clearing badge.");
      chrome.action.setBadgeText({ text: "" });
      chrome.action.setBadgeBackgroundColor({ color: "#00FF00" });
    } else {
      console.log("No token found. Setting badge.");
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
    }
  });
}

export type Book = {
  asin: string;
  title: string;
  author: string;
};

export type Annotation = {
  id: string;
  highlight: string;
  note: string;
};
