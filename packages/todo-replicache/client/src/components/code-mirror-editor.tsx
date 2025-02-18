import { crosshairCursor, EditorView, highlightActiveLineGutter, highlightSpecialChars, keymap } from "@codemirror/view";
import { useRef, useEffect } from "react";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  HighlightStyle,
  foldGutter,
} from "@codemirror/language";
import { defaultKeymap, historyKeymap, history } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import { completionKeymap, closeBracketsKeymap, closeBrackets } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { tags } from "@lezer/highlight";
import { useStore } from "../hooks/store";

export function CodeMirrorEditor({
  itemId,
  content,
  setSelectionAbove,
  setSelectionBelow,
  onUpdate,
  deleteOnBackspace = false,
}: {
  itemId: string;
  content: string;
  setSelectionAbove?: () => void;
  setSelectionBelow?: () => void;
  onUpdate?: (props: { itemId: string; getContent: () => string }) => void;
  deleteOnBackspace?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const store = useStore();
  // const notes = useSubscribe(
  //   store.rep,
  //   async (tx) => {
  //     const notes = await store.items.getAll(tx);
  //     return notes;
  //   },
  //   { dependencies: [], default: [] as Item[] }
  // );
  // const notesRef = useRef(notes);
  // notesRef.current = notes;

  useEffect(() => {
    if (!container.current) return;
    const view = new EditorView({
      doc: content,
      parent: container.current,
      extensions: [
        markdown(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onUpdate?.({ itemId, getContent: () => update.state.doc.toString() });
          }
        }),
        // Internally, codemirror represents code elements (e.g., keywords,
        // strings, comments) as semantic representations. The @lezer/highlight
        // package provides a set of predefined tags, such as tags.keyword and
        // tags.comment, which are used to identify different parts of the code.
        // Codemirror doesn't apply stable human-readable classes to these tags,
        // but allows you to customize the styles for these tags through extensions
        // like this one.
        syntaxHighlighting(
          HighlightStyle.define([
            { tag: tags.heading1, textDecoration: "none" },
            { tag: tags.heading2, textDecoration: "none" },
            { tag: tags.heading3, textDecoration: "none" },
            { tag: tags.url, color: "var(--text-secondary)" },
          ])
        ),
        // Set the caret color to the primary text color
        EditorView.theme({
          ".cm-content": {
            caretColor: "var(--text-primary)",
          },
          ".cm-gutters": {
            backgroundColor: "transparent",
            borderRight: "none",
          },
          ".cm-activeLineGutter": {
            backgroundColor: "transparent",
          },
        }),
        // A line number gutter
        // lineNumbers(),
        // A gutter with code folding markers
        foldGutter(),
        // Replace non-printable characters with placeholders
        highlightSpecialChars(),
        // The undo history
        history(),
        // Allow multiple cursors/selections
        EditorState.allowMultipleSelections.of(true),
        // Re-indent lines when typing specific input
        indentOnInput(),
        // Highlight syntax with a default style
        syntaxHighlighting(defaultHighlightStyle),
        // Highlight matching brackets near cursor
        bracketMatching(),
        // Automatically close brackets
        closeBrackets(),
        // Load the autocompletion system
        // autocompletion({
        //   activateOnTyping: true,
        //   override: [
        //     (ctx: CompletionContext) => {
        //       // If user hasn't typed "@", skip
        //       const tokenBefore = ctx.matchBefore(/@[\w\s-]+/);
        //       if (!tokenBefore) return null;

        //       // Offer completions for all possible notes
        //       return {
        //         from: tokenBefore.from + 1, // after '@'
        //         options: notesRef.current.map((n) => {
        //           return {
        //             label: n.name || n.content,
        //             apply: (view: EditorView) => {
        //               const title = n.content.match(/^#\s+([^\n]+)\n/)?.[1]?.trim();
        //               const alias = n.name || title || n.content.slice(0, 20) + (n.content.length > 20 ? "..." : "") || n.id;
        //               const snippet = `[${alias}](./${n.id}.md)`;
        //               view.dispatch({
        //                 changes: {
        //                   from: tokenBefore.from,
        //                   to: ctx.pos,
        //                   insert: snippet,
        //                 },
        //               });
        //             },
        //           };
        //         }),
        //       };
        //     },
        //   ],
        // }),
        // Change the cursor to a crosshair when holding alt
        crosshairCursor(),
        // Style the gutter for current line specially
        highlightActiveLineGutter(),
        keymap.of([
          {
            key: "Escape",
            run: (view) => {
              if (view.hasFocus) {
                view.dom.blur();
                return true;
              }
              return false;
            },
          },
          {
            key: "ArrowUp",
            run: (view) => {
              if (view.state.selection.main.from === 0) {
                setSelectionAbove?.();
                return true;
              }
              return false;
            },
          },
          {
            key: "ArrowDown",
            run: (view) => {
              if (view.state.selection.main.from === view.state.doc.length) {
                setSelectionBelow?.();
                return true;
              }
              return false;
            },
          },
          {
            key: "Backspace",
            run: (view) => {
              if (deleteOnBackspace && view.state.selection.main.from === 0 && view.state.doc.toString().trim() === "") {
                store.items.delete(itemId);
                return true;
              }
              return false;
            },
          },
          // Closed-brackets aware backspace
          ...closeBracketsKeymap,
          // A large set of basic bindings
          ...defaultKeymap,
          // Search-related keys
          ...searchKeymap,
          // Redo/undo keys
          ...historyKeymap,
          // Code folding bindings
          ...foldKeymap,
          // Autocompletion keys
          ...completionKeymap,
          // Keys related to the linter system
          ...lintKeymap,
        ]),
      ],
    });
    return () => view.destroy();
  }, [onUpdate, itemId, setSelectionAbove, setSelectionBelow]);

  return <div ref={container}></div>;
}
