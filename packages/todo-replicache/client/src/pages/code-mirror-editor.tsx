import { crosshairCursor, EditorView, highlightActiveLineGutter, highlightSpecialChars, keymap } from "@codemirror/view";
import { useRef, useEffect, useMemo } from "react";
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
import {
  completionKeymap,
  closeBracketsKeymap,
  autocompletion,
  closeBrackets,
  CompletionContext,
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { tags } from "@lezer/highlight";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";

const contentAtom = atomWithStorage<string | null>("content", null);

const notes = [
  { id: "note1", title: "Taylors notes" },
  { id: "note2", title: "Notes from the meeting" },
  { id: "note3", title: "Notes from the call" },
];

export default function CodeMirrorPage() {
  const container = useRef<HTMLDivElement>(null);
  const [content, setContent] = useAtom(contentAtom);
  // Content at initial load. Is null while loading.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialContent = useMemo(() => content ?? null, [content === null]);

  useEffect(() => {
    if (!container.current) return;
    if (initialContent === null) return;
    const view = new EditorView({
      doc: initialContent,
      parent: container.current,
      extensions: [
        markdown(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setContent(update.state.doc.toString());
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
        autocompletion({
          activateOnTyping: true,
          override: [
            (ctx: CompletionContext) => {
              // If user hasn't typed "@", skip
              const tokenBefore = ctx.matchBefore(/@\w*/);
              if (!tokenBefore) return null;

              // Offer completions for all possible notes
              return {
                from: tokenBefore.from + 1, // after '@'
                options: notes.map((n) => ({
                  label: n.title,
                  apply: (view: EditorView) => {
                    // Insert something like: [Note Title](./note-id.md)
                    const snippet = `[${n.title}](./${n.id}.md)`;
                    view.dispatch({
                      changes: {
                        from: tokenBefore.from,
                        to: ctx.pos,
                        insert: snippet,
                      },
                    });
                  },
                })),
              };
            },
          ],
        }),
        // Change the cursor to a crosshair when holding alt
        crosshairCursor(),
        // Style the gutter for current line specially
        highlightActiveLineGutter(),
        keymap.of([
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
  }, [initialContent, setContent]);

  return <div className="mt-16 ml-4 [&_.cm-content]:caret-[var(--text-primary)]" ref={container}></div>;
}
