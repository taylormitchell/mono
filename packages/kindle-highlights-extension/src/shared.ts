export async function updateBadge() {
  if (!(await readAmazonAccessible()) || !(await checkHaveToken())) {
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
  } else {
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setBadgeBackgroundColor({ color: "#00FF00" });
  }
}

export function checkHaveToken() {
  return new Promise<boolean>((resolve) => {
    chrome.storage.local.get("token", (result) => {
      resolve(!!result.token);
    });
  });
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
