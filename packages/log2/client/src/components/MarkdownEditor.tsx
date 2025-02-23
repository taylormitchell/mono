import { useEffect, useRef } from "react";
import { EditorView } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { keymap, dropCursor, rectangularSelection, highlightActiveLineGutter, crosshairCursor } from "@codemirror/view";
import { indentOnInput, bracketMatching, foldKeymap } from "@codemirror/language";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";

export function MarkdownEditor({ content, onChange }: { content: string; onChange: (content: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const initialContent = useRef(content);

  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      parent: editorRef.current,
      doc: initialContent.current,
      extensions: [
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const doc = update.state.doc.toString();
            onChange(doc);
          }
        }),
        EditorView.theme({
          ".cm-content": {
            caretColor: "var(--text-primary)",
          },
        }),
        highlightActiveLineGutter(),
        history(),
        dropCursor(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
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
        markdown(),
      ],
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [onChange]);

  return (
    <div>
      <div className="[&_.cm-content]:caret-[var(--text-primary)]" ref={editorRef} />
    </div>
  );
}
