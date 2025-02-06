import { useEffect, useRef } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema, defaultMarkdownParser, defaultMarkdownSerializer } from "prosemirror-markdown";
import { exampleSetup } from "prosemirror-example-setup";
import { isHotkey } from "is-hotkey";
import "./MarkdownEditor.css";

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  onEscape?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function MarkdownEditor({
  content,
  onChange,
  onBlur,
  autoFocus,
  placeholder,
  onEscape,
  onDelete,
  onMoveUp,
  onMoveDown,
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Create the editor view
    const view = new EditorView(editorRef.current, {
      state: EditorState.create({
        doc: defaultMarkdownParser.parse(content),
        plugins: exampleSetup({ schema }),
      }),
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
          onBlur?.();
          return false;
        },
        keydown: (view, event) => {
          if (isHotkey("escape", event)) {
            onEscape?.();
            return true;
          }
          if (isHotkey("backspace", event) && !content) {
            onDelete?.();
            return true;
          }
          if (isHotkey("cmd+arrowup", event)) {
            onMoveUp?.();
            return true;
          }
          if (isHotkey("cmd+arrowdown", event)) {
            onMoveDown?.();
            return true;
          }
          return false;
        },
      },
    });

    viewRef.current = view;

    if (autoFocus) {
      view.focus();
    }

    return () => {
      view.destroy();
    };
  }, []);

  // Update content when it changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = defaultMarkdownSerializer.serialize(view.state.doc);
    if (currentContent !== content) {
      const state = EditorState.create({
        doc: defaultMarkdownParser.parse(content),
        plugins: exampleSetup({ schema }),
      });
      view.updateState(state);
    }
  }, [content]);

  return <div ref={editorRef} className="flex-1 prose prose-invert max-w-none" data-placeholder={placeholder} />;
}
