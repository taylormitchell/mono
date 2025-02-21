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
import { historyKeymap, history, standardKeymap } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import { syntaxTree } from "@codemirror/language";
import {
  completionKeymap,
  closeBracketsKeymap,
  closeBrackets,
  autocompletion,
  CompletionContext,
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { tags } from "@lezer/highlight";
import { useStore } from "../hooks/store";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { featureFlagsAtom } from "../lib/atoms";
import { vim } from "@replit/codemirror-vim";

export function CodeMirrorEditor({
  itemId,
  content,
  setSelectionAbove,
  setSelectionBelow,
  onUpdate,
  onUnmount,
  deleteOnBackspace = false,
  autoFocus = false,
}: {
  itemId: string;
  content: string;
  setSelectionAbove?: () => void;
  setSelectionBelow?: () => void;
  onUpdate?: (props: { itemId: string; content: string }) => void;
  onUnmount?: (props: { itemId: string; content: string }) => void;
  deleteOnBackspace?: boolean;
  autoFocus?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const store = useStore();
  const navigate = useNavigate();
  const featureFlags = useAtomValue(featureFlagsAtom);
  // The initial content is the content value when this item id was first rendered.
  // We do this to avoid the editor getting re-created every time we save it's content.
  const initialContent = useMemo(() => {
    return content;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  useEffect(() => {
    if (!container.current) return;
    const view = new EditorView({
      doc: initialContent,
      parent: container.current,
      extensions: [
        ...(featureFlags.vimMode ? [vim()] : []),
        autocompletion({
          activateOnTyping: true,
          override: [
            async (ctx: CompletionContext) => {
              // If user hasn't typed "@", skip
              const tokenBefore = ctx.matchBefore(/@[\w\s-]+/);
              if (!tokenBefore) return null;

              // Offer completions for all possible notes
              const notes = await store.items.getAll();
              return {
                from: tokenBefore.from + 1, // after '@'
                options: notes.map((n) => {
                  return {
                    label: n.name || n.content,
                    apply: (view: EditorView) => {
                      let alias = n.name;
                      if (alias === null) {
                        const firstCharIndex = n.content.match(/\w/s)?.index || 0;
                        const newLineIndex =
                          firstCharIndex + (n.content.slice(firstCharIndex).match(/\n/)?.index || n.content.length);
                        const title = n.content.slice(firstCharIndex, newLineIndex).trim();
                        alias = title;
                      }
                      const snippet = `[${alias}](./${n.id}.md)`;
                      view.dispatch({
                        changes: {
                          from: tokenBefore.from,
                          to: ctx.pos,
                          insert: snippet,
                        },
                      });
                    },
                  };
                }),
              };
            },
          ],
        }),
        markdown(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onUpdate?.({ itemId, content: update.state.doc.toString() });
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
            { tag: tags.link, cursor: "pointer" },
            { tag: tags.url, color: "var(--text-secondary)" },
          ])
        ),
        EditorView.domEventHandlers({
          click: (event, view) => {
            console.log("clicked");
            const pos = view.posAtDOM(event.target as Node);
            const tree = syntaxTree(view.state);
            const node = tree.resolveInner(pos);

            // Find the URL node
            let urlNode: typeof node | null = null;
            if (node.name === "URL") {
              urlNode = node;
            } else if (node.name === "Link") {
              const cursor = node.cursor();
              while (cursor.next()) {
                if (cursor.name === "URL") {
                  urlNode = cursor.node;
                  break;
                }
              }
            }
            if (!urlNode) return false;

            const url = view.state.doc.sliceString(urlNode.from, urlNode.to);
            event.preventDefault();
            if (url.startsWith("./")) {
              const id = url.slice(2).split(".")[0];
              navigate(`/items/${id}`);
            } else {
              window.open(url);
            }
            return true;
          },
        }),
        // Set the caret color to the primary text color
        EditorView.theme({
          ".cm-content": {
            caretColor: "var(--text-primary)",
          },
          ".cm-focused": {
            outline: "none",
          },
          ".cm-gutters": {
            backgroundColor: "transparent",
            borderRight: "none",
          },
          ".cm-activeLineGutter": {
            backgroundColor: "transparent",
          },
        }),
        // Enable word wrapping
        EditorView.lineWrapping,
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

        // Change the cursor to a crosshair when holding alt
        crosshairCursor(),
        // Style the gutter for current line specially
        highlightActiveLineGutter(),
        keymap.of([
          {
            key: "Escape",
            run: (view) => {
              if (view.hasFocus && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
                return true;
              }
              return false;
            },
            stopPropagation: true,
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
                setSelectionAbove?.();
                return true;
              }
              return false;
            },
          },
          // Closed-brackets aware backspace
          ...closeBracketsKeymap,
          // A large set of basic bindings
          ...standardKeymap,
          // ...defaultKeymap,
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
    if (autoFocus) {
      view.focus();
    }
    return () => {
      onUnmount?.({ itemId, content: view.state.doc.toString() });
      view.destroy();
    };
  }, [
    itemId,
    initialContent,
    onUpdate,
    onUnmount,
    setSelectionAbove,
    setSelectionBelow,
    deleteOnBackspace,
    store.items,
    autoFocus,
    navigate,
    featureFlags.vimMode,
  ]);

  return <div ref={container}></div>;
}
