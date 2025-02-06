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
  placeholder?: string;
  isEditing?: boolean;
  setEditingId?: (id: string | null) => void;
}

export function MarkdownEditor({ item, content, onChange, placeholder, isEditing, setEditingId }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Create the editor view
    const view = new EditorView(editorRef.current, {
      state: createState(content),
      dispatchTransaction(transaction) {
        const newState = view.state.apply(transaction);
        view.updateState(newState);
        const newContent = defaultMarkdownSerializer.serialize(newState.doc);
        if (newContent !== content) {
          onChange(newContent);
        }
      },
      handleDOMEvents: {
        blur: () => {
          setEditingId?.(null);
          return false;
        },
        focus: () => {
          setEditingId?.(item.id);
          return false;
        },
        keydown: (view, event) => {
          if (isHotkey("escape", event)) {
            return true;
          }
          if (isHotkey("up", event) || isHotkey("down", event)) {
            //   event.preventDefault();
            event.stopPropagation();
            return false;
          }
          //   return false;
        },
      },
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  useEffect(() => {
    if (isEditing && !viewRef.current?.hasFocus()) {
      viewRef.current?.focus();
    } else if (!isEditing && viewRef.current?.hasFocus()) {
      viewRef.current?.dom.blur();
    }
  }, [isEditing]);

  // Update content when it changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = defaultMarkdownSerializer.serialize(view.state.doc);
    if (currentContent !== content) {
      const state = createState(content);
      view.updateState(state);
    }
  }, [content]);

  return <div ref={editorRef} className="flex-1 prose prose-invert max-w-none" data-placeholder={placeholder} />;
}
