import { useSubscribe } from "replicache-react";
import { useStore } from "../hooks/store";
import { useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { GLOBAL_PROMPT_ID } from "../lib/utils";

export function PromptEdit() {
  const store = useStore();
  const navigate = useNavigate();
  const [editedContent, setEditedContent] = useState<string | null>(null);

  const prompt = useSubscribe(
    store.rep,
    async (tx) => {
      return await store.prompt.get(GLOBAL_PROMPT_ID, tx);
    },
    { default: null }
  );

  const handleChange = useCallback((content: string) => {
    setEditedContent(content);
  }, []);

  const handleSave = async () => {
    if (await store.prompt.has(GLOBAL_PROMPT_ID)) {
      await store.prompt.update(GLOBAL_PROMPT_ID, { text: editedContent || "" });
    } else {
      await store.prompt.create({
        id: GLOBAL_PROMPT_ID,
        text: editedContent || "",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-primary/90 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-base">
        <h2 className="text-lg font-semibold">Edit Global Prompt</h2>
        <button onClick={() => navigate("/")} className="p-2 hover-bg rounded">
          Close
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <MarkdownEditor key={prompt?.id} content={prompt?.text || ""} onChange={handleChange} />
      </div>

      <div className="p-4 border-t border-base">
        <button
          disabled={editedContent === null || editedContent === prompt?.text}
          className="w-full py-2 bg-[var(--accent-color)] rounded hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
          onClick={handleSave}
        >
          Save Prompt
        </button>
      </div>
    </div>
  );
}
