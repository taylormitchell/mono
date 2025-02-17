import { useEffect, useRef } from "react";
import { EditorView } from "prosemirror-view";
import { exampleSetup } from "prosemirror-example-setup";
import { schema, defaultMarkdownSerializer } from "prosemirror-markdown";
import { markdownParser } from "./markdown-parser";
import { DOMSerializer } from "prosemirror-model";
import "./MarkdownEditor.css";
import { EditorState } from "prosemirror-state";

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

    // Remove the static content. Without this, you briefly see the static content
    // and the editor content in the same render pass.
    editorRef.current.innerHTML = "";

    const view = new EditorView(editorRef.current, {
      state: EditorState.create({
        doc: markdownParser.parse(contentRef.current),
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
      // I'm a bit surprised we don't need to do `editorRef.current.innerHTML = ""` here. I expected this
      // to trigger a re-render, and that would re-create the static content. Seems like it doesn't though.
      viewRef.current.dispatch(
        viewRef.current.state.tr.replaceWith(0, viewRef.current.state.doc.content.size, markdownParser.parse(content))
      );
    }
  }, [content]);

  return (
    <div ref={editorRef} className="w-full h-full">
      <StaticMarkdown content={content} editorIsMounted={!!viewRef.current} />
    </div>
  );
}

/**
* We render the markdown immediately in a static div, before the editor is
* mounted. When rendering a list of items each with an editor, if you don't
* render this first, there's a slight delay before the editor is rendered and
* the list flickers due to the items initially being empty. To avoid this, we
* render a static version of the markdown right away, and then later remove it
* and replace it with the real editor.

* Note: If you try conditionally rendering the static content based on whether
* the editor is mounted, react throws an error like:
* ```
* Uncaught (in promise) NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.
* ```
 */
function StaticMarkdown({ content, editorIsMounted }: { content: string; editorIsMounted: boolean }) {
  let html = "";
  if (!editorIsMounted) {
    const doc = markdownParser.parse(content);
    const el = DOMSerializer.fromSchema(schema).serializeFragment(doc.content);
    const tempContainer = document.createElement("div");
    tempContainer.appendChild(el);
    html = tempContainer.innerHTML;
  }
  return <div className="ProseMirror min-h-0" dangerouslySetInnerHTML={{ __html: html }} />;
}
