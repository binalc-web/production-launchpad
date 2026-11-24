import { Extension } from "@tiptap/core";

export const PrdKeyboardShortcuts = Extension.create({
  name: "prdKeyboardShortcuts",

  addKeyboardShortcuts() {
    return {
      "Mod-u": () => this.editor.commands.toggleUnderline(),
      "Mod-Alt-0": () => this.editor.commands.setParagraph(),
      "Mod-Alt-1": () => this.editor.commands.toggleHeading({ level: 1 }),
      "Mod-Alt-2": () => this.editor.commands.toggleHeading({ level: 2 }),
      "Mod-Alt-3": () => this.editor.commands.toggleHeading({ level: 3 }),
      "Mod-Alt-4": () => this.editor.commands.toggleHeading({ level: 4 }),
      "Mod-Alt-5": () => this.editor.commands.toggleHeading({ level: 5 }),
      "Mod-Alt-6": () => this.editor.commands.toggleHeading({ level: 6 }),
      "Mod-Shift-7": () => this.editor.commands.toggleOrderedList(),
      "Mod-Shift-8": () => this.editor.commands.toggleBulletList(),
      "Mod-Shift-9": () => this.editor.commands.toggleTaskList(),
      "Mod-Shift-b": () => this.editor.commands.toggleBlockquote(),
      "Mod-Alt-c": () => this.editor.commands.toggleCodeBlock(),
      "Mod-Shift-h": () => this.editor.commands.setHorizontalRule(),
    };
  },
});
