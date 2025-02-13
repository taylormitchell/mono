import { useEffect, useRef, useState } from "react";
import { EditorView } from "codemirror";
import { json } from "@codemirror/lang-json";
import { keymap, dropCursor, rectangularSelection, highlightActiveLineGutter, crosshairCursor } from "@codemirror/view";
import { indentOnInput, bracketMatching, foldKeymap } from "@codemirror/language";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";

export function JsonEditor({ content: initialContent, onChange }: { content: string; onChange: (content: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      parent: editorRef.current,
      doc: initialContent,
      extensions: [
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const doc = update.state.doc.toString();
            try {
              JSON.parse(doc);
              onChange(doc);
              setError(null);
            } catch {
              setError("Invalid JSON");
            }
          }
        }),
        EditorView.theme({
          ".cm-content": {
            caretColor: "var(--text-primary)",
          },
        }),
        highlightActiveLineGutter(),
        history(),
        // drawSelection(),
        dropCursor(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        // highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          //   {
          //     key: "ArrowUp",
          //     run: (view) => {
          //       if (!onKeyDown) return false;
          //       return onKeyDown(e, {
          //         itemId,
          //         content: view.state.doc.toString(),
          //         contentType: "json",
          //         selection: {
          //           fromAt:
          //             view.state.selection.main.from === 0
          //               ? "start"
          //               : view.state.selection.main.from === view.state.doc.length
          //               ? "end"
          //               : "middle",
          //           toAt:
          //             view.state.selection.main.to === 0
          //               ? "start"
          //               : view.state.selection.main.to === view.state.doc.length
          //               ? "end"
          //               : "middle",
          //         },
          //       });
          //     },
          //   },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
        ]),
        json(),
      ],
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [initialContent, onChange]);

  return (
    <div>
      <div className="[&_.cm-content]:caret-[var(--text-primary)]" ref={editorRef} />
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}
