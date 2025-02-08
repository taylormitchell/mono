import { useEffect, useRef } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema, defaultMarkdownParser, defaultMarkdownSerializer } from "prosemirror-markdown";
import { exampleSetup } from "prosemirror-example-setup";
import "./MarkdownEditor.css";
import isHotkey from "is-hotkey";
import { Item } from "../../../shared/types";

function createState(content: string) {
  return EditorState.create({
    doc: defaultMarkdownParser.parse(content),
    plugins: exampleSetup({ schema, menuBar: false, floatingMenu: false, menuContent: [] }),
  });
}

interface MarkdownEditorProps {
  item: Item;
  initialContent: string;
  onChange: (content: string) => void;
  placeholder?: string;
  isEditing?: boolean;
  setEditingId?: (id: string | null) => void;
}

export function MarkdownEditor({
  item,
  initialContent,
  onChange,
  placeholder = "",
  isEditing = false,
  setEditingId,
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const initialContentRef = useRef(initialContent);
  useEffect(() => {
    if (!editorRef.current) return;

    const state = createState(initialContentRef.current);
    const view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction(transaction) {
        const newState = view.state.apply(transaction);
        view.updateState(newState);
        const newContent = defaultMarkdownSerializer.serialize(newState.doc);
        if (transaction.docChanged) {
          onChange(newContent);
        }
      },
      handleDOMEvents: {
        focus: () => {
          setEditingId?.(item.id);
        },
      },
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [setEditingId, item.id, onChange]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isHotkey("escape", e)) {
        e.preventDefault();
        setEditingId?.(null);
      }
    };

    view.dom.addEventListener("keydown", handleKeyDown);
    return () => view.dom.removeEventListener("keydown", handleKeyDown);
  }, [setEditingId]);

  return (
    <div
      ref={editorRef}
      className="w-full h-full"
      onClick={() => !isEditing && setEditingId?.(item.id)}
      data-placeholder={placeholder}
    />
  );
}
