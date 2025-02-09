import { useEffect, useRef, useState, useCallback } from "react";
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
}

export function MarkdownEditor({ item, placeholder = "", isEditing = false, setEditingId }: MarkdownEditorProps) {
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

  const handleContentChange = useCallback(
    (newContent: string) => {
      const title = item.name === null ? newContent.match(/^#\s+([^\n]+)\n/)?.[1]?.trim() : undefined;
      if (title) {
        store.items.update(item.id, { name: title });
      }
      setContent(newContent);
      debouncedUpdate(item.id, newContent);
    },
    [item.id, item.name, store, debouncedUpdate]
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
          handleContentChange(newContent);
        }
      },
      handleDOMEvents: {
        focus: () => {
          setEditingId?.(item.id);
        },
        keydown: (view, e) => {
          if (isHotkey("escape", e)) {
            view.dom.blur();
          }
        },
      },
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [setEditingId, item.id, handleContentChange]);

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
