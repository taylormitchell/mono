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
  content: string;
  onChange: (content: string) => void;
  onAddTitle?: (name: string | null) => void;
  placeholder?: string;
  isEditing?: boolean;
  setEditingId?: (id: string | null) => void;
}

export function MarkdownEditor({
  item,
  content,
  onChange,
  onAddTitle,
  placeholder = "",
  isEditing = false,
  setEditingId,
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = createState(content);
    const view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction(transaction) {
        const newState = view.state.apply(transaction);
        view.updateState(newState);
        const newContent = defaultMarkdownSerializer.serialize(newState.doc);
        onChange(newContent);
      },
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [isEditing]);

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
      className="prose prose-invert max-w-none"
      onClick={() => !isEditing && setEditingId?.(item.id)}
      data-placeholder={placeholder}
    />
  );
}
