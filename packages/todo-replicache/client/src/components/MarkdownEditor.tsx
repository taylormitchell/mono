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
  onUpdate,
}: {
  itemId: string;
  content: string;
  onBlur?: (e: FocusEvent, props: { itemId: string; getContent: () => string; contentType: "markdown" | "json" }) => void;
  onKeyDown?: (
    e: KeyboardEvent,
    props: {
      itemId: string;
      getContent: () => string;
      contentType: "markdown" | "json";
      selection: { fromAt: "start" | "end" | "middle"; toAt: "start" | "end" | "middle" };
    }
  ) => boolean;
  onUpdate?: (props: { itemId: string; getContent: () => string }) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Create the editor view, and re-create whenever the itemId or
  // handlers change. Updating the content is handled separately and
  // is why we use a ref.
  const contentRef = useRef(content);
  contentRef.current = content;
  useEffect(() => {
    if (!editorRef.current) return;
    const view = new EditorView(editorRef.current, {
      state: EditorState.create({
        doc: defaultMarkdownParser.parse(contentRef.current),
        plugins: exampleSetup({ schema, menuBar: false, floatingMenu: false, menuContent: [] }),
      }),
      dispatchTransaction: (tr) => {
        const newState = view.state.apply(tr);
        view.updateState(newState);
        if (tr.docChanged) {
          onUpdate?.({ itemId, getContent: () => defaultMarkdownSerializer.serialize(newState.doc) });
        }
      },
      handleDOMEvents: {
        blur: (view, e) => {
          onBlur?.(e, {
            itemId,
            getContent: () => defaultMarkdownSerializer.serialize(view.state.doc),
            contentType: "markdown",
          });
        },
        keydown: (_, e) => {
          if (!onKeyDown) return false;
          onKeyDown(e, {
            itemId,
            getContent: () => defaultMarkdownSerializer.serialize(view.state.doc),
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
    return () => view.destroy();
  }, [itemId, onBlur, onKeyDown, onUpdate]);

  // Update the editor content when the content changes.
  useEffect(() => {
    if (!viewRef.current) return;
    const currentContent = defaultMarkdownSerializer.serialize(viewRef.current.state.doc);
    if (currentContent !== content) {
      viewRef.current.dispatch(
        viewRef.current.state.tr.replaceWith(0, viewRef.current.state.doc.content.size, defaultMarkdownParser.parse(content))
      );
    }
  }, [content]);

  return <div ref={editorRef} className="w-full h-full" />;
}
