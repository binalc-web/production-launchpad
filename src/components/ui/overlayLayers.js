/**
 * Shared overlay z-index. Dialog/sheet/drawer overlay+content must match so a
 * nested portal stacks on top (DOM order). Menus sit one step above.
 */
export const OVERLAY_LAYERS = {
  modal: "z-[100]",
  floating: "z-[110]",
};
