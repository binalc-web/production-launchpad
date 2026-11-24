import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { filterSlashCommands } from "./prdSlashCommandRegistry.js";

/** @type {import('react').MutableRefObject<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean } | null>} */
let slashMenuRef = null;

export function setSlashMenuRef(ref) {
  slashMenuRef = ref;
}

export const PrdSlashCommandExtension = Extension.create({
  name: "prdSlashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        items: ({ query }) => filterSlashCommands(query),
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        render: () => {
          let popupActive = false;

          return {
            onStart: (props) => {
              popupActive = true;
              slashMenuRef?.current?.onStart?.(props);
            },
            onUpdate: (props) => {
              slashMenuRef?.current?.onUpdate?.(props);
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                popupActive = false;
                slashMenuRef?.current?.onExit?.();
                return true;
              }
              return slashMenuRef?.current?.onKeyDown?.(props) ?? false;
            },
            onExit: () => {
              if (popupActive) slashMenuRef?.current?.onExit?.();
              popupActive = false;
            },
          };
        },
      }),
    ];
  },
});
