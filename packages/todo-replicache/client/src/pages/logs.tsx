import { useEffect, useRef, useState } from "react";
import { ulid } from "ulid";
import { EditorView } from "codemirror";
import { json } from "@codemirror/lang-json";
import { Check, X } from "lucide-react";
import { Extension } from "@codemirror/state";
import { keymap, drawSelection, highlightActiveLine, dropCursor, rectangularSelection, crosshairCursor } from "@codemirror/view";
import { indentOnInput, bracketMatching, foldKeymap } from "@codemirror/language";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";

// import { Check, X } from "lucide-react";

type Log = {
  id: string;
  data: any;
};

type Message = {
  id: string;
  content: string;
  type: "user" | "assistant";
  suggestion?: string;
  editedSuggestion?: string;
  state: "loading" | "pending" | "accepted" | "rejected";
};

const basicSetup: Extension = (() => [
  // lineNumbers(),
  // highlightActiveLineGutter(),
  // highlightSpecialChars(),
  history(),
  // foldGutter(),
  drawSelection(),
  dropCursor(),
  indentOnInput(),
  // syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ]),
])();

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
        state: "pending",
      },
    ]);

    // Add assistant message in loading state
    setMessages((prev) => [
      ...prev,
      {
        id: ulid(),
        content: "",
        type: "assistant",
        state: "loading",
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
          msg.state === "loading"
            ? {
                id: msg.id,
                content: "I suggest creating this log:",
                type: "assistant",
                state: "pending",
                suggestion: JSON.stringify(data, null, 2),
              }
            : msg
        )
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.state === "loading"
            ? {
                id: msg.id,
                content: "Sorry, there was an error processing your request.",
                type: "assistant",
                state: "pending",
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
            {message.state === "loading" ? (
              <div className="animate-pulse">Loading...</div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>{message.content}</div>
                  <div className="flex items-center gap-2">
                    {message.suggestion && message.state === "pending" && (
                      <>
                        <button
                          onClick={() => {
                            try {
                              const acceptedSuggestion = message.editedSuggestion || message.suggestion || "";
                              const newLog = JSON.parse(acceptedSuggestion);
                              setLogs((prev) => [...prev, { id: ulid(), data: newLog }]);
                              setMessages((prev) =>
                                prev.map((msg) =>
                                  msg.id === message.id
                                    ? {
                                        ...msg,
                                        suggestion: acceptedSuggestion,
                                        content: "Log created successfully!",
                                        state: "accepted",
                                      }
                                    : msg
                                )
                              );
                            } catch {
                              setMessages((prev) =>
                                prev.map((msg) => (msg.id === message.id ? { ...msg, content: "Error: Invalid JSON" } : msg))
                              );
                            }
                          }}
                          className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setMessages((prev) =>
                              prev.map((msg) =>
                                msg.id === message.id ? { ...msg, content: "Log creation cancelled", state: "rejected" } : msg
                              )
                            );
                          }}
                          className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    {message.suggestion && (message.state === "accepted" || message.state === "rejected") && (
                      <div className="ml-2">
                        {message.state === "accepted" ? <Check className="text-green-500" /> : <X className="text-red-500" />}
                      </div>
                    )}
                  </div>
                </div>
                {message.suggestion && (
                  <div className="mt-2">
                    <CodeMirrorEditor
                      initialData={message.suggestion}
                      setDoc={(doc) => {
                        setMessages((prev) =>
                          prev.map((msg) => (msg.id === message.id ? { ...msg, editedSuggestion: doc } : msg))
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

function CodeMirrorEditor({ initialData, setDoc }: { initialData: string; setDoc: (doc: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setDocRef = useRef(setDoc);
  setDocRef.current = setDoc;
  useEffect(() => {
    if (!editorRef.current) return;

    setDocRef.current(initialData);
    const view = new EditorView({
      parent: editorRef.current,
      doc: initialData,
      extensions: [
        basicSetup,
        json(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const doc = update.state.doc.toString();
            setDocRef.current(doc);
            try {
              JSON.parse(doc);
              setError(null);
            } catch {
              setError("Invalid JSON");
            }
          }
        }),
      ],
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [initialData]);

  return (
    <div>
      <div ref={editorRef} />
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}
