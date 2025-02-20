import { useState, useRef, useEffect, useCallback } from "react";
import { useSubscribe } from "replicache-react";
import { Item } from "../../../shared/types";
import { isHotkey } from "is-hotkey";
import { cn } from "../lib/utils";
import { useStore } from "../hooks/store";
import { useNavigate } from "react-router-dom";
import { ulid } from "ulid";
import { LucideExpand } from "lucide-react";
import { CodeMirrorEditor } from "../components/code-mirror-editor";
import { useDebounce } from "../hooks/use-debounce";

function ItemRow({ item, focusSearch }: { item: Item; focusSearch: () => void }) {
  const store = useStore();
  const navigate = useNavigate();

  const setSelectionAbove = useCallback(() => {
    const el = document.getElementById(item.id)?.previousElementSibling?.querySelector("[contenteditable='true']");
    if (el instanceof HTMLElement) {
      el.focus();
    } else {
      focusSearch();
    }
  }, [item.id, focusSearch]);

  const setSelectionBelow = useCallback(() => {
    const el = document.getElementById(item.id)?.nextElementSibling?.querySelector("[contenteditable='true']");
    if (el instanceof HTMLElement) el.focus();
  }, [item.id]);

  const handleUpdate = useDebounce(({ itemId, content }: { itemId: string; content: string }) => {
    store.items.update(itemId, { content });
  }, 1000);

  return (
    <div
      id={item.id}
      className={cn(
        "item flex items-start my-1 px-4 py-2 border border-primary rounded-md hover:bg-[var(--hover-color)] relative group"
      )}
    >
      <div className="flex-1">
        <div className="flex items-center gap-4">
          <CodeMirrorEditor
            itemId={item.id}
            content={item.content}
            setSelectionAbove={setSelectionAbove}
            setSelectionBelow={setSelectionBelow}
            deleteOnBackspace={true}
            onUpdate={handleUpdate}
          />
        </div>
      </div>
      <div className="absolute top-0 right-0 flex items-center gap-0 group-hover:opacity-100 opacity-0">
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

function focusItem(id: string) {
  const editor = document.getElementById(id)?.querySelector("[contenteditable='true']");
  if (editor) {
    (editor as HTMLElement).focus();
  }
}

export function StandardView() {
  const store = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemsContainerRef = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(20);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (
        (isHotkey("n", e) || isHotkey("shift+n", e)) &&
        !document.activeElement?.matches('input, textarea, [contenteditable="true"]')
      ) {
        e.preventDefault();
        e.stopPropagation();
        const id = ulid();
        await store.items.create({ id, content: "" });
        if (e.shiftKey) {
          navigate(`/items/${id}`);
        } else {
          setTimeout(() => focusItem(id));
        }
      }
      if (isHotkey("ctrl+.", e)) {
        const itemId = document.activeElement?.closest(".item")?.id;
        if (itemId) {
          e.preventDefault();
          e.stopPropagation();
          navigate(`/items/${itemId}`);
          return;
        }
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
  }, [store, searchQuery, navigate]);

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
    <div className="h-full w-full pb-8 flex flex-col items-center">
      <div className="w-full h-10 pl-12 flex items-center gap-4 ml-4">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search..."
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
          className={cn("outline-none")}
        />
        <button
          onClick={() => {
            const id = ulid();
            store.items.create({ id });
            setTimeout(() => focusItem(id), 100);
          }}
          className="md:hidden flex items-center justify-center w-8 h-8 ml-auto mr-2 hover:bg-secondary/10"
        >
          <span className="text-xl">+</span>
        </button>
      </div>
      <div
        ref={itemsContainerRef}
        className={cn(
          "w-full flex-1 pt-4",
          "flex justify-center",
          "overflow-y-auto overflow-x-hidden",
          "scrollbar-hide hover:scrollbar-default [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#30363d] [&::-webkit-scrollbar-track]:bg-transparent"
        )}
      >
        <div className="w-[1000px] min-w-0 flex flex-col shrink">
          {filteredItems.slice(0, limit).map((item) => (
            <ItemRow key={item.id} item={item} focusSearch={focusSearch} />
          ))}
          {limit < filteredItems.length && (
            <button onClick={() => setLimit(limit + 20)} className="text-xs text-secondary my-8">
              Show more
            </button>
          )}
          <div className="h-[100px] w-full shrink-0"></div>
        </div>
      </div>
    </div>
  );
}
