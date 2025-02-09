import { useEffect, useRef, useState } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema, defaultMarkdownParser, defaultMarkdownSerializer } from "prosemirror-markdown";
import { exampleSetup } from "prosemirror-example-setup";
import "./MarkdownEditor.css";
import isHotkey from "is-hotkey";
import { Item } from "../../../shared/types";
import { useStore } from "../hooks/store";
import { useDebounce } from "../hooks/use-debounce";

function createState(content: string) {
  return EditorState.create({
    doc: defaultMarkdownParser.parse(content),
    plugins: exampleSetup({ schema, menuBar: false, floatingMenu: false, menuContent: [] }),
  });
}

interface MarkdownEditorProps {
  item: Item;
  isEditing?: boolean;
  setEditingId?: (id: string | null) => void;
  placeholder?: string;
  onUpAtTop?: (e: KeyboardEvent) => void;
  onDownAtBottom?: (e: KeyboardEvent) => void;
}

export function MarkdownEditor({
  item,
  placeholder = "",
  isEditing = false,
  setEditingId,
  onUpAtTop,
  onDownAtBottom,
}: MarkdownEditorProps) {
  const store = useStore();
  const [content, setContent] = useState(item.content);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const debouncedUpdate = useDebounce(
    (id: string, content: string) => {
      store.items.update(id, { content });
    },
    300,
    [store]
  );

  useEffect(() => {
    if (!editorRef.current) return;

    const state = createState(content);
    const view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction(transaction) {
        const newState = view.state.apply(transaction);
        view.updateState(newState);
        const newContent = defaultMarkdownSerializer.serialize(newState.doc);
        if (transaction.docChanged) {
          const title = item.name === null ? newContent.match(/^#\s+([^\n]+)\n/)?.[1]?.trim() : undefined;
          if (title) {
            store.items.update(item.id, { name: title });
          }
          setContent(newContent);
          debouncedUpdate(item.id, newContent);
        }
      },
      handleDOMEvents: {
        focus: () => {
          setEditingId?.(item.id);
        },
        keydown: (view, e) => {
          if (isHotkey("escape", e)) {
            view.dom.blur();
          } else if (isHotkey("backspace", e)) {
            const content = defaultMarkdownSerializer.serialize(view.state.doc);
            if (content === "") {
              e.preventDefault();
              const prevElement = document.getElementById(item.id)?.previousElementSibling;
              store.items.delete(item.id);
              if (prevElement) {
                const editor = prevElement.querySelector(".ProseMirror");
                if (editor) {
                  (editor as HTMLElement).focus();
                }
              }
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
  }, [setEditingId, item.id, debouncedUpdate, onUpAtTop, onDownAtBottom]);

  // Focus the editor when it's being edited
  useEffect(() => {
    if (isEditing && viewRef.current && !viewRef.current.hasFocus()) {
      viewRef.current.dom.focus();
    }
  }, [isEditing]);

  return (
    <div
      ref={editorRef}
      className="w-full h-full"
      onClick={() => !isEditing && setEditingId?.(item.id)}
      data-placeholder={placeholder}
    />
  );
}
