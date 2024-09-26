export async function updateBadge() {
  const isAmazonAccessible = await readAmazonAccessible();
  if (!isAmazonAccessible) {
    return showBadge();
  }
  const haveToken = new Promise<boolean>((resolve) => {
    chrome.storage.local.get("token", (result) => {
      resolve(!!result.token);
    });
  });
  if (!haveToken) {
    return showBadge();
  }
  hideBadge();
}

function showBadge() {
  chrome.action.setBadgeText({ text: "!" });
  chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
}

function hideBadge() {
  chrome.action.setBadgeText({ text: "" });
  chrome.action.setBadgeBackgroundColor({ color: "#00FF00" });
}

export function readAmazonAccessible() {
  return new Promise<boolean>((resolve) => {
    fetch("https://read.amazon.com/notebook", {
      method: "GET",
      credentials: "include",
    })
      .then((response) => {
        resolve(response.ok);
      })
      .catch(() => {
        resolve(false);
      });
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
