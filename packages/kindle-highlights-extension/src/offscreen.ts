chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== "offscreen") return;
  if (message.type === "get-annotations") {
    const { html } = message.data;
    const document = new DOMParser().parseFromString(html, "text/html");
    const annotationElements = document.querySelectorAll("#annotations .annotation");
    const annotations = [];
    for (const annotationElement of Array.from(annotationElements)) {
      const highlightElement = annotationElement.querySelector(".highlight");
      const noteElement = annotationElement.querySelector(".note");
      annotations.push({
        highlight: highlightElement?.textContent,
        note: noteElement?.textContent,
      });
    }
    chrome.runtime.sendMessage({
      type: "annotations-parsed",
      target: "background",
      messageId: message.messageId,
      data: {
        annotations,
      },
    });
  } else if (message.type === "get-asins") {
    const { html } = message.data;
    const document = new DOMParser().parseFromString(html, "text/html");
    const asins = [];
    const asinElements = document.querySelectorAll(".asin");
    for (const asinElement of Array.from(asinElements)) {
      asins.push(asinElement.textContent);
    }
    chrome.runtime.sendMessage({
      type: "asins-parsed",
      target: "background",
      messageId: message.messageId,
      data: {
        asins,
      },
    });
  }
});
