import { EditorView } from "prosemirror-view";
import { EditorState, TextSelection } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import { schema, defaultMarkdownParser, defaultMarkdownSerializer } from "prosemirror-markdown";
import { exampleSetup } from "prosemirror-example-setup";
import { useRef, useEffect } from "react";

export function ProsemirrorMarkdownEditor({
  value,
  onChange,
  onFocus,
  onBlur,
  autoFocus,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  autoFocus?: boolean;
  style?: React.CSSProperties;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const refs = useRef({
    value,
    onChange,
    onFocus,
    onBlur,
    autoFocus,
  });
  refs.current = { value, onFocus, onBlur, onChange, autoFocus };

  // Initialize the editor
  useEffect(() => {
    if (!editorRef.current) return;
    const view = new EditorView(editorRef.current, {
      state: EditorState.create({
        schema,
        plugins: [
          ...exampleSetup({ schema, menuBar: false }),
          new Plugin({
            props: {
              handleDOMEvents: {
                focus: () => {
                  refs.current?.onFocus();
                  return false;
                },
                blur: () => {
                  refs.current?.onBlur();
                  return false;
                },
              },
            },
            view: () => ({
              update: (view, prevState) => {
                if (!view.state.doc.eq(prevState.doc)) {
                  const newValue = defaultMarkdownSerializer.serialize(view.state.doc);
                  refs.current?.onChange(newValue);
                }
              },
            }),
          }),
        ],
        doc: defaultMarkdownParser.parse(refs.current.value),
      }),
    });
    if (refs.current.autoFocus) {
      view.focus();
    }
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update the editor when the value changes
  useEffect(() => {
    if (!viewRef.current) return;
    if (viewRef.current.hasFocus()) return;
    const { state } = viewRef.current;
    const { from, to } = state.selection;
    const newDoc = defaultMarkdownParser.parse(value);
    const tr = viewRef.current.state.tr.replaceWith(0, state.doc.nodeSize - 2, newDoc);
    // Preserve the selection
    tr.setSelection(new TextSelection(tr.doc.resolve(from), tr.doc.resolve(to)));
    viewRef.current.dispatch(tr);
  }, [value]);

  return <div ref={editorRef} style={style} />;
}
