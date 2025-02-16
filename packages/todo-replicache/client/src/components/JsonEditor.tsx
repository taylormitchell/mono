import { useEffect, useRef, useState } from "react";
import { EditorView } from "codemirror";
import { json } from "@codemirror/lang-json";
import { EditorState } from "@codemirror/state";
import { keymap, dropCursor, rectangularSelection, highlightActiveLineGutter, crosshairCursor } from "@codemirror/view";
import { indentOnInput, bracketMatching, foldKeymap } from "@codemirror/language";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";

export function JsonEditor({
  itemId,
  content,
  readOnly = false,
  onBlur,
  onKeyDown,
}: {
  itemId: string;
  content: string;
  readOnly?: boolean;
  onBlur?: (e: FocusEvent, props: { itemId: string; getContent: () => string; contentType: "markdown" | "json" }) => void;
  onKeyDown?: (
    e: KeyboardEvent,
    props: {
      itemId: string;
      getContent: () => string;
      contentType: "markdown" | "json";
      selection: { fromAt: "start" | "end" | "middle"; toAt: "start" | "end" | "middle" };
    }
  ) => boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      parent: editorRef.current,
      doc: content,
      extensions: [
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
  }, [content, itemId, readOnly, onBlur, onKeyDown]);

  return (
    <div>
      <div
        className="[&_.cm-content]:caret-[var(--text-primary)]"
        ref={editorRef}
        onBlur={(e) => {
          const view = viewRef.current;
          if (!view) return;
          onBlur?.(e.nativeEvent, {
            itemId,
            getContent: () => view.state.doc.toString(),
            contentType: "json",
          });
        }}
      />
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}
