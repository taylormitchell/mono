import { useEffect, useRef, useState } from "react";
import { ulid } from "ulid";
import { EditorView, basicSetup } from "codemirror";
import { json } from "@codemirror/lang-json";

type Log = {
  id: string;
  data: any;
};

type Message = {
  id: string;
  content: string;
  type: "user" | "assistant";
  suggestion?: any;
  editedSuggestion?: any;
  status: "complete" | "loading";
};

export function LogsPage() {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<Log[]>([
    {
      id: ulid(),
      data: {
        type: "meditated",
        startedAt: "2024-01-01T00:00:00Z",
        endedAt: "2024-01-01T00:10:00Z",
        original: "meditated for 10m",
      },
    },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const messageId = ulid();
    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        content: inputMessage,
        type: "user",
        status: "complete",
      },
    ]);

    // Add assistant message in loading state
    setMessages((prev) => [
      ...prev,
      {
        id: ulid(),
        content: "",
        type: "assistant",
        status: "loading",
      },
    ]);

    try {
      const response = await fetch("http://localhost:3078/api/ai", {
        method: "POST",
        body: JSON.stringify({
          type: "create-log",
          prompt: inputMessage,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      // Update assistant message with suggestion
      setMessages((prev) =>
        prev.map((msg) =>
          msg.status === "loading"
            ? {
                id: msg.id,
                content: "I suggest creating this log:",
                type: "assistant",
                status: "complete",
                suggestion: data,
              }
            : msg
        )
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.status === "loading"
            ? {
                id: msg.id,
                content: "Sorry, there was an error processing your request.",
                type: "assistant",
                status: "complete",
              }
            : msg
        )
      );
    }
    setInputMessage("");
  };

  return (
    <div className="p-4 max-w-4xl mx-auto flex flex-col h-screen">
      <h1 className="text-2xl font-bold mb-6">Logs</h1>

      <div className="flex-1 overflow-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-4 rounded ${
              message.type === "user"
                ? "bg-[var(--accent-color)] ml-12"
                : "bg-[var(--bg-secondary)] border border-[#30363d] mr-12"
            }`}
          >
            {message.status === "loading" ? (
              <div className="animate-pulse">Loading...</div>
            ) : (
              <>
                <div>{message.content}</div>
                {message.suggestion && (
                  <div className="mt-2">
                    <CodeMirrorEditor
                      initialData={message.suggestion}
                      onChange={(newData) => {
                        try {
                          const parsed = JSON.parse(newData);
                          setMessages((prev) =>
                            prev.map((msg) => (msg.id === message.id ? { ...msg, editedSuggestion: parsed } : msg))
                          );
                        } catch (e) {
                          // Invalid JSON - do nothing
                        }
                      }}
                      onAccept={(newData) => {
                        const suggestion = JSON.parse(newData);
                        setLogs((prev) => [
                          ...prev,
                          {
                            id: ulid(),
                            data: message.editedSuggestion || message.suggestion,
                          },
                        ]);
                        setMessages((prev) =>
                          prev.map((msg) => (msg.id === message.id ? { ...msg, content: "Log created successfully!" } : msg))
                        );
                      }}
                      onReject={() => {
                        setMessages((prev) =>
                          prev.map((msg) => (msg.id === message.id ? { ...msg, content: "Suggestion rejected." } : msg))
                        );
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="sticky bottom-0 bg-[var(--bg-primary)] pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 rounded border border-[#30363d] bg-[var(--bg-secondary)]"
          />
          <button type="submit" className="px-4 py-2 bg-[var(--accent-color)] rounded hover:opacity-90">
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

type CodeMirrorEditorData =
  | {
      type: "invalid";
      error: string;
      data: string;
    }
  | {
      type: "valid";
      data: object;
    };

function CodeMirrorEditor({
  initialData,
  onChange,
  onAccept,
  onReject,
}: {
  initialData: any;
  onChange: (data: CodeMirrorEditorData) => void;
  onAccept?: (data: CodeMirrorEditorData) => void;
  onReject?: (data: CodeMirrorEditorData) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [data, setData] = useState<CodeMirrorEditorData>({
    type: "valid",
    data: initialData,
  });

  useEffect(() => {
    if (!editorRef.current) return;

    const doc = JSON.stringify(initialData, null, 2);
    const view = new EditorView({
      parent: editorRef.current,
      doc,
      extensions: [
        basicSetup,
        json(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            let data: CodeMirrorEditorData;
            try {
              data = { type: "valid", data: JSON.parse(update.state.doc.toString()) };
            } catch {
              data = { type: "invalid", error: "Invalid JSON", data: update.state.doc.toString() };
            }
            onChange(data);
            setData(data);
          }
        }),
      ],
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [initialData, onChange]);

  return (
    <div>
      <div ref={editorRef} />
      {data.type === "invalid" && <div className="text-red-500">{data.error}</div>}
      <div className="mt-2 flex gap-2">
        <button onClick={() => onAccept?.(data.data)} className="px-3 py-1 bg-green-600 rounded hover:opacity-90">
          Accept
        </button>
        <button onClick={() => onReject?.(data.data)} className="px-3 py-1 bg-red-600 rounded hover:opacity-90">
          Reject
        </button>
      </div>
    </div>
  );
}
