import { useEffect, useRef } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema, defaultMarkdownParser, defaultMarkdownSerializer } from "prosemirror-markdown";
import { exampleSetup } from "prosemirror-example-setup";
import "./MarkdownEditor.css";
import isHotkey from "is-hotkey";
import { useStore } from "../hooks/store";

export function MarkdownEditor({
  itemId,
  name,
  content,
  onUpAtTop,
  onDownAtBottom,
}: {
  itemId: string;
  name: string | null;
  content: string;
  onUpAtTop?: (e: KeyboardEvent) => void;
  onDownAtBottom?: (e: KeyboardEvent) => void;
}) {
  const store = useStore();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const doc = defaultMarkdownParser.parse(content);
    if (itemId === "01JKTM3Z65ZQH28H8S1YD1QE3B") {
      console.log({ content, doc });
    }
    const view = new EditorView(editorRef.current, {
      state: EditorState.create({
        doc,
        plugins: exampleSetup({ schema, menuBar: false, floatingMenu: false, menuContent: [] }),
      }),
      handleDOMEvents: {
        blur: (view) => {
          const newContent = defaultMarkdownSerializer.serialize(view.state.doc);
          const title = name === null ? newContent.match(/^#\s+([^\n]+)\n/)?.[1]?.trim() : undefined;
          store.items.update(itemId, { content: newContent, name: title });
        },
        keydown: (view, e) => {
          if (isHotkey("escape", e)) {
            view.dom.blur();
          } else if (isHotkey("backspace", e)) {
            const content = defaultMarkdownSerializer.serialize(view.state.doc);
            if (content === "") {
              e.preventDefault();
              const prevItemId = document.getElementById(itemId)?.previousElementSibling?.id;
              if (prevItemId) {
                setTimeout(() => {
                  const el = document.querySelector(`[id="${prevItemId}"] .ProseMirror`);
                  if (el instanceof HTMLElement) el.focus();
                });
              }
              store.items.delete(itemId);
            }
          } else if (isHotkey("up", e) && onUpAtTop && view.state.selection.from === 1) {
            e.preventDefault();
            onUpAtTop(e);
          } else if (isHotkey("down", e) && onDownAtBottom && view.state.selection.from === view.state.doc.content.size - 1) {
            e.preventDefault();
            onDownAtBottom(e);
          }
        },
      },
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [itemId, name, content, onUpAtTop, onDownAtBottom, store.items]);

  return <div ref={editorRef} className="w-full h-full" />;
}
