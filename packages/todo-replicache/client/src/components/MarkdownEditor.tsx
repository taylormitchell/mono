import { useEffect, useRef } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema, defaultMarkdownParser, defaultMarkdownSerializer } from "prosemirror-markdown";
import { exampleSetup } from "prosemirror-example-setup";
import "./MarkdownEditor.css";

export function MarkdownEditor({
  itemId,
  content,
  onBlur,
  onKeyDown,
}: {
  itemId: string;
  content: string;
  onBlur?: (e: FocusEvent, props: { itemId: string; content: string; contentType: "markdown" | "json" }) => void;
  onKeyDown?: (
    e: KeyboardEvent,
    props: {
      itemId: string;
      content: string;
      contentType: "markdown" | "json";
      selection: { fromAt: "start" | "end" | "middle"; toAt: "start" | "end" | "middle" };
    }
  ) => boolean;
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
        blur: (view, e) => {
          const doc = defaultMarkdownSerializer.serialize(view.state.doc);
          onBlur?.(e, { itemId, content: doc, contentType: "markdown" });
        },
        keydown: (_, e) => {
          if (!onKeyDown) return false;
          onKeyDown(e, {
            itemId,
            content,
            contentType: "markdown",
            selection: {
              fromAt:
                view.state.selection.from === 1
                  ? "start"
                  : view.state.selection.from === view.state.doc.content.size - 1
                  ? "end"
                  : "middle",
              toAt:
                view.state.selection.to === 1
                  ? "start"
                  : view.state.selection.to === view.state.doc.content.size - 1
                  ? "end"
                  : "middle",
            },
          });
        },
      },
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [itemId, content, onBlur, onKeyDown]);

  return <div ref={editorRef} className="w-full h-full" />;
}
