import { useState } from "react";
import { useSubscribe } from "replicache-react";
import { Item } from "../../../shared/types";
import { isHotkey } from "is-hotkey";
import { cn, comparePositions } from "../lib/utils";
import { useStore } from "../hooks/store";
import { useNavigate } from "react-router-dom";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { useEffect } from "react";
import { moveTo } from "../lib/positions";
import { ulid } from "ulid";

function ItemRow({
  item,
  editingId,
  setEditingId,
  move,
}: {
  item: Item;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  move: null | { up: () => void; down: () => void };
}) {
  const store = useStore();
  const navigate = useNavigate();

  const handleDelete = () => {
    const prevElement = document.getElementById(item.id)?.previousElementSibling;
    store.items.delete(item.id);
    if (prevElement) {
      const editor = prevElement.querySelector(".ProseMirror");
      if (editor) {
        (editor as HTMLElement).focus();
      }
    }
  };

  return (
    <div
      id={item.id}
      className={cn(
        "item flex flex-grow items-center px-4 py-2 hover:bg-[var(--hover-color)]",
        editingId === item.id ? "bg-[var(--hover-color)]" : ""
      )}
    >
      {item.status !== null && (
        <div className="mr-3">
          <input
            type="checkbox"
            checked={item.status === "completed"}
            onChange={(e) => {
              store.items.update(item.id, {
                status: e.target.checked ? "completed" : "active",
              });
            }}
            className="rounded-full border-[#30363d]"
          />
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center gap-4">
          <MarkdownEditor item={item} isEditing={editingId === item.id} setEditingId={setEditingId} placeholder="Untitled" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(`/items/${item.id}`)} className="p-1.5 text-[#6e7681] rounded">
          <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
            <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
        {move && (
          <div className="flex items-center gap-1">
            <button onClick={move.up} className="p-1.5 text-[#6e7681] rounded" aria-label="Move up">
              <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
                <path d="M3.47 7.78a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018L9 4.81v7.44a.75.75 0 0 1-1.5 0V4.81L4.53 7.78a.75.75 0 0 1-1.06 0Z" />
              </svg>
            </button>
            <button onClick={move.down} className="p-1.5 text-[#6e7681] rounded" aria-label="Move down">
              <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
                <path d="M13.03 8.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.47 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L7 11.19V3.75a.75.75 0 0 1 1.5 0v7.44l2.97-2.97a.75.75 0 0 1 1.06 0Z" />
              </svg>
            </button>
          </div>
        )}
        <button onClick={handleDelete} className="ml-2 p-1 text-[#6e7681] rounded">
          <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

export function StandardView() {
  const store = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      const isInEditor = (e.target as HTMLElement).closest(".ProseMirror") !== null;
      if (isHotkey("n", e) && !editingId && !isInEditor) {
        e.preventDefault();
        e.stopPropagation();
        const id = ulid();
        await store.items.create({ id, content: "" });
        setEditingId(id);
      }
      if (isHotkey("escape", e) && editingId) {
        e.preventDefault();
        e.stopPropagation();
        setEditingId(null);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [store, editingId]);

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
      if (!allItems) return [];
      if (!view.filter?.status) return allItems;
      return allItems.filter((item) => item.status === view.filter.status);
    },
    { default: [] as Item[], dependencies: [view] }
  );

  if (!view) return null;

  const filteredItems = items
    .filter((item) => item.content.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (view.sort.field === "position") {
        return comparePositions(a, b, view.positions);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <div className="flex items-center gap-4">
        <div className="w-4 md:w-0" /> {/* Spacer for mobile menu button */}
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md py-1.5 px-3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]"
        />
        <button onClick={() => store.items.create({ content: "" })} title="New Item">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden rounded-md border border-[var(--border-color)] scrollbar-hide hover:scrollbar-default [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#30363d] [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="item-row divide-y divide-[#30363d]">
          {filteredItems.map((item, i) => (
            <ItemRow
              key={item.id}
              item={item}
              editingId={editingId}
              setEditingId={setEditingId}
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
