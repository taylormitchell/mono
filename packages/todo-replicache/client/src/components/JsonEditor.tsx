import { useEffect, useRef, useState } from "react";
import { EditorView } from "codemirror";
import { json } from "@codemirror/lang-json";
import { Extension, EditorState } from "@codemirror/state";
import {
  keymap,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
} from "@codemirror/view";
import { indentOnInput, bracketMatching, foldKeymap } from "@codemirror/language";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";

const basicSetup: Extension = (() => [
  highlightActiveLineGutter(),
  history(),
  drawSelection(),
  dropCursor(),
  indentOnInput(),
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

export function JsonEditor({
  itemId,
  initialData,
  readOnly = false,
  onBlur,
  onKeyDown,
}: {
  itemId: string;
  initialData: string;
  readOnly?: boolean;
  onBlur?: (e: FocusEvent, props: { itemId: string; content: string; contentType: "markdown" | "json" }) => void;
  onKeyDown?: (
    e: KeyboardEvent,
    props: {
      itemId: string;
      content: string;
      contentType: "markdown" | "json";
      selection: { fromAt: "start" | "end" | "middle"; toAt: "start" | "end" | "middle" };
    }
  ) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      parent: editorRef.current,
      doc: initialData,
      extensions: [
        basicSetup,
        json(),
        EditorState.readOnly.of(readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const doc = update.state.doc.toString();
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
  }, [initialData, itemId, readOnly, onBlur, onKeyDown]);

  return (
    <div>
      <div
        ref={editorRef}
        onBlur={(e) => {
          const view = viewRef.current;
          if (!view) return;
          onBlur?.(e.nativeEvent, { itemId, content: view.state.doc.toString(), contentType: "json" });
        }}
        onKeyDown={(e) => {
          const view = viewRef.current;
          if (!view) return;
          onKeyDown?.(e.nativeEvent, {
            itemId,
            content: view.state.doc.toString(),
            contentType: "json",
            selection: {
              fromAt:
                view.state.selection.main.from === 0
                  ? "start"
                  : view.state.selection.main.from === view.state.doc.length
                  ? "end"
                  : "middle",
              toAt:
                view.state.selection.main.to === 0
                  ? "start"
                  : view.state.selection.main.to === view.state.doc.length
                  ? "end"
                  : "middle",
            },
          });
        }}
      />
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}
