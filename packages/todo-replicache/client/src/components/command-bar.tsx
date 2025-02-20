import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { useStore } from "../hooks/store";
import { ulid } from "ulid";

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const store = useStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Menu"
      className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[90vw] max-w-[640px] rounded-xl bg-primary border border-primary p-2 shadow-lg"
    >
      <Command.Input
        placeholder="Type a command or search..."
        className="w-full bg-transparent border-none outline-none px-3 py-2 text-secondary"
      />
      <Command.List className="mt-2">
        <Command.Group>
          <Command.Item
            onSelect={() => {
              navigate("/");
              setOpen(false);
            }}
            className="px-3 py-2 rounded-md aria-selected:bg-[var(--bg-tertiary)] cursor-pointer text-secondary"
          >
            Go to Home
          </Command.Item>
          <Command.Item
            onSelect={() => {
              navigate("/settings");
              setOpen(false);
            }}
            className="px-3 py-2 rounded-md aria-selected:bg-[var(--bg-tertiary)] cursor-pointer text-secondary"
          >
            Go to Settings
          </Command.Item>
          <Command.Item
            onSelect={async () => {
              const id = ulid();
              await store.items.create({ id, content: "" });
              navigate(`/items/${id}`);
              setOpen(false);
            }}
            className="px-3 py-2 rounded-md aria-selected:bg-[var(--bg-tertiary)] cursor-pointer text-secondary"
          >
            Create New Item
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
