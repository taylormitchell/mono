import { html } from "./layout";

export function sidebar({
  lists,
  currentListId,
  tags,
  currentTag,
}: {
  lists: any[];
  currentListId?: string;
  tags: string[];
  currentTag?: string;
}) {
  return html` <h1>Lists</h1>
    <ul class="lists">
      ${lists
        .map(
          (l) =>
            html`<li class="${l.id === currentListId ? "active" : ""}">
              <a href="/list/${l.id}">${l.title}</a>
            </li>`
        )
        .join("")}
    </ul>
    <hr />
    <h1>Tags</h1>
    <ul class="tags">
      ${tags
        .map(
          (t) =>
            html`<li class="${t === currentTag ? "active" : ""}">
              <a href="/tag/${encodeURIComponent(t)}">#${t}</a>
            </li>`
        )
        .join("")}
    </ul>`;
}
