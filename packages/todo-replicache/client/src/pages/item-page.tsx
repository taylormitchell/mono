import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSubscribe } from "replicache-react";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { useStore } from "../hooks/store";
import { useDebounce } from "../hooks/use-debounce";
import isHotkey from "is-hotkey";

export function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const item = useSubscribe(
    store.rep,
    async (tx) => {
      if (!id) return null;
      const item = (await store.items.get(id, tx)) ?? (await store.items.getByName(id, tx));
      return item ?? null;
    },
    { default: null, dependencies: [id] }
  );
  const [name, setName] = useState(item?.name ?? "");
  useEffect(() => {
    setName(item?.name ?? "");
  }, [item]);

  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  const debouncedGetNames = useDebounce(async () => {
    const names = (await store.rep.query((tx) => store.items.getAll(tx))).map((i) => i.name).filter((i) => i !== null);
    setExistingNames(new Set(names));
  }, 200);
  const conflictingName = item && existingNames.has(name) && name !== item.name;

  const handleUpdate = useDebounce(({ itemId, getContent }: { itemId: string; getContent: () => string }) => {
    store.items.update(itemId, { content: getContent() });
  }, 1000);

  const handleKeyDownInEditor = useCallback((e: KeyboardEvent) => {
    if (isHotkey("escape", e) && e.currentTarget instanceof HTMLElement) {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.blur();
      return true;
    }
    return false;
  }, []);

  useEffect(
    function handleKeyDownOutsideEditor() {
      const f = (e: KeyboardEvent) => isHotkey("escape", e) && navigate("/");
      document.addEventListener("keydown", f);
      return () => document.removeEventListener("keydown", f);
    },
    [navigate]
  );

  if (!id) {
    navigate("/");
    return null;
  }

  if (!item) return null;

  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-y-auto scrollbar-hide hover:scrollbar-default [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#30363d] [&::-webkit-scrollbar-track]:bg-transparent"
    >
      <div className="max-w-3xl mx-auto pb-32">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              onFocus={debouncedGetNames}
              onBlur={() => {
                debouncedGetNames.cancel();
                if (conflictingName) {
                  setName(item.name ?? "");
                } else {
                  store.items.update(id, { name });
                }
              }}
              className={`mb-2 px-2 py-1 text-xs font-mono bg-[var(--bg-primary)] border-none outline-none ${
                conflictingName ? "border-red-500" : "border-[var(--border-color)]"
              } rounded-md text-[var(--text-secondary)] w-auto`}
            />
            {conflictingName && <span className="text-xs text-[#6e7681]">Name already exists</span>}
          </div>
          <MarkdownEditor itemId={item.id} content={item.content} onUpdate={handleUpdate} onKeyDown={handleKeyDownInEditor} />
        </div>
      </div>
    </div>
  );
}
