import { useState, useRef, useEffect, useCallback } from "react";
import { useSubscribe } from "replicache-react";
import { Item } from "../../../shared/types";
import { isHotkey } from "is-hotkey";
import { cn } from "../lib/utils";
import { useStore } from "../hooks/store";
import { useNavigate } from "react-router-dom";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { moveTo } from "../lib/positions";
import { ulid } from "ulid";
import { LucideExpand, Plus } from "lucide-react";
import { defaultMarkdownSerializer } from "prosemirror-markdown";
import { EditorView } from "prosemirror-view";
import { JsonEditor } from "../components/JsonEditor";

function ItemRow({
  item,
  move,
  focusSearch,
}: {
  item: Item;
  move: null | { up: () => void; down: () => void };
  focusSearch: () => void;
}) {
  const store = useStore();
  const navigate = useNavigate();

  const handleBlur = useCallback(
    async (_: FocusEvent, props: { itemId: string; content: string; contentType: "markdown" | "json" }) => {
      const item = await store.items.get(props.itemId);
      if (!item) return;
      if (props.contentType === "markdown") {
        const title = item.name === null ? props.content.match(/^#\s+([^\n]+)\n/)?.[1]?.trim() : undefined;
        store.items.update(item.id, { content: props.content, name: title });
      } else {
        store.items.update(item.id, { content: props.content });
      }
    },
    [store.items]
  );

  const handleKeyDown = useCallback(
    (view: EditorView, e: KeyboardEvent, itemId: string) => {
      if (isHotkey("escape", e)) {
        view.dom.blur();
      } else if (isHotkey("backspace", e)) {
        const content = defaultMarkdownSerializer.serialize(view.state.doc);
        if (content === "") {
          e.preventDefault();
          const prevItemId = document.getElementById(itemId)?.previousElementSibling?.id;
          if (prevItemId) {
            setTimeout(() => {
              const el = document.querySelector(`[id="${prevItemId}"] .ProseMirror`);
              if (el instanceof HTMLElement) el.focus();
            });
          }
          store.items.delete(itemId);
        }
      } else if (isHotkey("up", e) && view.state.selection.from === 1) {
        e.preventDefault();
        const prevElement = document.getElementById(itemId)?.previousElementSibling;
        if (prevElement?.id) {
          const el = prevElement.querySelector(".ProseMirror");
          if (el instanceof HTMLElement) el.focus();
        } else {
          focusSearch();
        }
      } else if (isHotkey("down", e) && view.state.selection.from === view.state.doc.content.size - 1) {
        e.preventDefault();
        const nextElement = document.getElementById(itemId)?.nextElementSibling;
        if (!nextElement?.id) return;
        const el = nextElement.querySelector(".ProseMirror");
        if (el instanceof HTMLElement) el.focus();
      }
    },
    [store.items, focusSearch]
  );

  return (
    <div id={item.id} className={cn("item flex flex-grow items-start px-4 py-2 hover:bg-[var(--hover-color)] relative")}>
      <div className="flex-1">
        <div className="flex items-center gap-4">
          {item.contentType === "markdown" ? (
            <MarkdownEditor
              itemId={item.id}
              name={item.name}
              content={item.content}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <JsonEditor itemId={item.id} initialData={item.content} onBlur={handleBlur} onKeyDown={handleKeyDown} />
          )}
        </div>
      </div>
      <div className="absolute top-0 right-0 flex items-center gap-0">
        <button onClick={() => navigate(`/items/${item.id}`)} className="p-1.5 text-[#6e7681] rounded">
          <LucideExpand size={12} />
        </button>
        <select
          value={item.contentType}
          onChange={(e) => store.items.update(item.id, { contentType: e.target.value as "markdown" | "json" })}
          className="bg-transparent text-xs text-[var(--text-secondary)]"
        >
          <option value="markdown">md</option>
          <option value="json">json</option>
        </select>
      </div>
    </div>
  );
}

export function StandardView() {
  const store = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (isHotkey("n", e) && !document.activeElement?.matches('input, textarea, [contenteditable="true"]')) {
        e.preventDefault();
        e.stopPropagation();
        const id = ulid();
        await store.items.create({ id, content: "" });
        setTimeout(() => {
          const editor = document.getElementById(id)?.querySelector(".ProseMirror");
          if (editor) {
            (editor as HTMLElement).focus();
          }
        }, 0);
      }
      if (isHotkey("escape", e)) {
        e.preventDefault();
        e.stopPropagation();
        const editor = document.activeElement?.closest(".ProseMirror");
        if (editor) {
          (editor as HTMLElement).blur();
        }
        if (document.activeElement === searchInputRef.current) {
          if (searchQuery !== "") {
            setSearchQuery("");
          } else {
            searchInputRef.current?.blur();
          }
        }
      }
      if (isHotkey("mod+/", e)) {
        e.preventDefault();
        e.stopPropagation();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [store, searchQuery]);

  const view = useSubscribe(
    store.rep,
    async (tx) => {
      const allView = await store.views.get(tx, "all");
      return allView ?? null;
    },
    { default: null }
  );

  // After pull, create the all view if it doesn't exist
  useEffect(() => {
    (async () => {
      await store.rep.pull();
      const view = await store.rep.query((tx) => store.views.get(tx, "all"));
      if (view) return;
      await store.views.create({ id: "all", name: "All" });
    })();
  }, [store.rep, store.views]);

  const items = useSubscribe(
    store.rep,
    async (tx) => {
      if (!view) return [];
      // TOOD: need to rename everything to match this convention later
      const allItems = await store.items.getAll(tx);
      return allItems;
      // if (!view.filter?.status) return allItems;
      // return allItems.filter((item) => item.status === view.filter.status);
    },
    { default: [] as Item[], dependencies: [view] }
  );

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  if (!view) return null;

  const filteredItems = items
    .filter((item) => {
      return item.content.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      // if (view.sort.field === "position") {
      //   return comparePositions(a, b, view.positions);
      // }
      return b.createdAt.localeCompare(a.createdAt);
    });

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <div className="flex items-center gap-4">
        <div className="w-4 md:w-0" /> {/* Spacer for mobile menu button */}
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onKeyDown={(e) => {
            if (isHotkey("down", e)) {
              e.preventDefault();
              e.stopPropagation();
              const el = itemsContainerRef.current?.querySelector(".ProseMirror");
              if (el instanceof HTMLElement) el.focus();
            }
          }}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md py-1.5 px-3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]"
        />
        <button onClick={() => store.items.create({ content: "" })} title="New Item">
          <Plus size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden rounded-md border border-[var(--border-color)] scrollbar-hide hover:scrollbar-default [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#30363d] [&::-webkit-scrollbar-track]:bg-transparent">
        <div ref={itemsContainerRef} className="item-row divide-y divide-[#30363d]">
          {filteredItems.map((item, i) => (
            <ItemRow
              key={item.id}
              item={item}
              focusSearch={focusSearch}
              move={
                view.sort.field === "position"
                  ? {
                      up: () => {
                        const newPositions = moveTo(filteredItems, i, i - 1, view.positions);
                        store.views.update(view.id, { ...view, positions: newPositions });
                      },
                      down: () => {
                        const newPositions = moveTo(filteredItems, i, i + 1, view.positions);
                        store.views.update(view.id, { ...view, positions: newPositions });
                      },
                    }
                  : null
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
