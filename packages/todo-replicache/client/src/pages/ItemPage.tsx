import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSubscribe } from "replicache-react";
import { Item } from "../../../shared/types";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { ulid } from "ulid";
import { useStore } from "../hooks/store";
import { isHotkey } from "is-hotkey";
import { useDebounce } from "../hooks/use-debounce";

function useItemView(itemId: string) {
  const store = useStore();
  const view = useSubscribe(
    store.rep,
    async (tx) => {
      const view = await store.views.get(tx, `item-${itemId}`);
      return view ?? null;
    },
    { default: null }
  );

  // Create view if it doesn't exist and we need to reorder
  const createViewIfNeeded = async () => {
    if (view) return view;
    const newView = {
      id: `item-${itemId}`,
      name: `Item ${itemId}`,
      filter: {},
      sort: { field: "position" as const, direction: "asc" as const },
      positions: {},
    };
    await store.views.create(newView);
    return newView;
  };

  return { view, createViewIfNeeded };
}

export function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Move hooks before any conditionals
  const item = useSubscribe(
    store.rep,
    async (tx) => {
      if (!id) return null;
      const item = await store.items.get(tx, id);
      return item ?? null;
    },
    { default: null, dependencies: [id] }
  );

  const children = useSubscribe(
    store.rep,
    async (tx) => {
      if (!item) return [];
      const allItems = await store.items.getAll(tx);
      return allItems.filter((i: Item) => item.children.includes(i.id));
    },
    { default: [], dependencies: [item] }
  );

  const { view, createViewIfNeeded } = useItemView(id ?? "");

  // Save and restore scroll position
  useEffect(() => {
    if (!id || !item) return;

    const scrollKey = `scroll-position-${id}`;
    const savedPosition = localStorage.getItem(scrollKey);

    // Use a small delay to ensure the DOM is ready
    const timer = setTimeout(() => {
      if (savedPosition && scrollContainerRef.current) {
        console.log("restoring scroll position", savedPosition);
        scrollContainerRef.current.scrollTop = parseInt(savedPosition);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [id, item]);

  const handleScroll = useDebounce(
    (scrollTop: number) => localStorage.setItem(`scroll-position-${id}`, scrollTop.toString()),
    100,
    [id]
  );

  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (isHotkey("n", e) && !editingId && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        e.stopPropagation();
        const childId = ulid();
        await store.items.create({ id: childId, content: "" });
        await store.items.update(id!, {
          children: [...(item?.children || []), childId],
        });
        setEditingId(childId);
      }
      if (isHotkey("escape", e) && editingId) {
        e.preventDefault();
        e.stopPropagation();
        setEditingId(null);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [store, editingId, id, item]);

  if (!id) {
    navigate("/");
    return null;
  }

  if (!item) return null;

  const handleNewChild = async () => {
    const childId = ulid();
    await store.items.create({ id: childId, content: "" });
    await store.items.update(id, {
      children: [...item.children, childId],
    });
    setEditingId(childId);
  };

  const sortedChildren = children.sort((a: Item, b: Item) => {
    if (!view || view.sort.field !== "position") {
      return b.createdAt.localeCompare(a.createdAt);
    }
    const aPos = view.positions[a.id] ?? Infinity;
    const bPos = view.positions[b.id] ?? Infinity;
    return aPos - bPos;
  });

  const filteredChildren = sortedChildren.filter((child) => child.content.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div
      ref={scrollContainerRef}
      onScroll={(e) => handleScroll(e.currentTarget.scrollTop)}
      className="h-full overflow-y-auto scrollbar-hide hover:scrollbar-default [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#30363d] [&::-webkit-scrollbar-track]:bg-transparent"
    >
      <div className="max-w-3xl mx-auto pb-32">
        <button
          onClick={() => navigate("/")}
          className="mb-8 px-3 py-1 bg-[#30363d] hover:bg-[#444c56] text-white rounded-md text-sm"
        >
          ← Back
        </button>

        <div className="mb-8">
          <MarkdownEditor
            item={item}
            content={item.content}
            onChange={(content) => store.items.update(id, { content })}
            isEditing={editingId === id}
            setEditingId={setEditingId}
            placeholder="Untitled"
          />
        </div>

        <div className="border-t border-[#30363d] pt-8 mb-[1000px]">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setShowSearch(!showSearch)} className="p-1.5 text-[#6e7681] hover:text-white rounded">
              <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
                <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"></path>
              </svg>
            </button>
            <button onClick={handleNewChild} className="p-1.5 text-[#6e7681] hover:text-white rounded">
              <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
                <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"></path>
              </svg>
            </button>
          </div>

          {showSearch && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search children..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-white placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
              />
            </div>
          )}

          <div className="overflow-y-auto rounded-md border border-[#30363d] bg-[#161b22] scrollbar-hide hover:scrollbar-default [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#30363d] [&::-webkit-scrollbar-track]:bg-transparent">
            <div className="divide-y divide-[#30363d]">
              {filteredChildren.map((child: Item, index: number) => (
                <div key={child.id} className="flex items-center gap-4 p-4 rounded-md bg-[#161b22] hover:bg-[#1c2128]">
                  <div className="flex-1">
                    <MarkdownEditor
                      item={child}
                      content={child.content}
                      onChange={(content) => store.items.update(child.id, { content })}
                      isEditing={editingId === child.id}
                      setEditingId={setEditingId}
                      placeholder="Untitled"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/items/${child.id}`)}
                      className="p-1.5 text-[#6e7681] hover:text-white rounded"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
                        <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
                      </svg>
                    </button>
                    {view && view.sort.field === "position" && (
                      <>
                        <button
                          onClick={async () => {
                            const v = await createViewIfNeeded();
                            const newPositions = { ...v.positions };
                            const currPos = newPositions[child.id] ?? index;
                            const prevChild = sortedChildren[index - 1];
                            if (prevChild) {
                              const prevPos = newPositions[prevChild.id] ?? index - 1;
                              newPositions[child.id] = prevPos;
                              newPositions[prevChild.id] = currPos;
                            }
                            store.views.update(v.id, { ...v, positions: newPositions });
                          }}
                          className="p-1.5 text-[#6e7681] hover:text-white rounded"
                          disabled={index === 0}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
                            <path d="M3.47 7.78a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018L9 4.81v7.44a.75.75 0 0 1-1.5 0V4.81L4.53 7.78a.75.75 0 0 1-1.06 0Z" />
                          </svg>
                        </button>
                        <button
                          onClick={async () => {
                            const v = await createViewIfNeeded();
                            const newPositions = { ...v.positions };
                            const currPos = newPositions[child.id] ?? index;
                            const nextChild = sortedChildren[index + 1];
                            if (nextChild) {
                              const nextPos = newPositions[nextChild.id] ?? index + 1;
                              newPositions[child.id] = nextPos;
                              newPositions[nextChild.id] = currPos;
                            }
                            store.views.update(v.id, { ...v, positions: newPositions });
                          }}
                          className="p-1.5 text-[#6e7681] hover:text-white rounded"
                          disabled={index === sortedChildren.length - 1}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
                            <path d="M13.03 8.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.47 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L7 11.19V3.75a.75.75 0 0 1 1.5 0v7.44l2.97-2.97a.75.75 0 0 1 1.06 0Z" />
                          </svg>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        store.items.update(id, {
                          children: item.children.filter((cid: string) => cid !== child.id),
                        });
                      }}
                      className="p-1.5 text-[#6e7681] hover:text-white rounded"
                      title="Remove from children"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
                        <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        store.items.update(id, {
                          children: item.children.filter((cid: string) => cid !== child.id),
                        });
                        store.items.delete(child.id);
                      }}
                      className="p-1.5 text-[#6e7681] hover:text-white rounded"
                      title="Delete item"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
                        <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
