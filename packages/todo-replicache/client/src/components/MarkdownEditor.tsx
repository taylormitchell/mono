import { useEffect, useRef } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema, defaultMarkdownParser } from "prosemirror-markdown";
import { exampleSetup } from "prosemirror-example-setup";
import "./MarkdownEditor.css";

export function MarkdownEditor({
  itemId,
  name,
  content,
  onBlur,
  onKeyDown,
}: {
  itemId: string;
  name: string | null;
  content: string;
  onBlur?: (view: EditorView) => void;
  onKeyDown?: (view: EditorView, e: KeyboardEvent) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView(editorRef.current, {
      state: EditorState.create({
        doc: defaultMarkdownParser.parse(content),
        plugins: exampleSetup({ schema, menuBar: false, floatingMenu: false, menuContent: [] }),
      }),
      handleDOMEvents: {
        blur: (view) => {
          onBlur?.(view);
        },
        keydown: (view, e) => {
          onKeyDown?.(view, e);
        },
      },
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [itemId, name, content, onBlur, onKeyDown]);

  return <div ref={editorRef} className="w-full h-full" />;
}
