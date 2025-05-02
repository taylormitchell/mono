export const html = (strings: TemplateStringsArray, ...values: any[]) => {
  // Don't auto-escape since we're controlling the inputs
  let out = "";
  strings.forEach((s, i) => {
    out += s + (i < values.length ? values[i] ?? "" : "");
  });
  return out;
};

export function layout({
  title,
  body,
  sidebar,
  extraHead = "",
}: {
  title: string;
  body: string;
  sidebar: string;
  extraHead?: string;
}) {
  return html` <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <link rel="stylesheet" href="/public/style.css" />
        ${extraHead}
      </head>
      <body>
        <div class="sidebar">${sidebar}</div>
        <main>${body}</main>
        <script type="module" src="/public/client.js"></script>
      </body>
    </html>`;
}
