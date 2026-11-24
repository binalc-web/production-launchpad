import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const PrdSlashMenu = forwardRef(function PrdSlashMenu(_, ref) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const commandRef = useRef(null);
  const propsRef = useRef(null);

  const selectItem = (index) => {
    const item = items[index];
    const props = propsRef.current;
    if (!item || !props) return;
    props.command(item);
    setOpen(false);
  };

  useImperativeHandle(ref, () => ({
    onStart(props) {
      propsRef.current = props;
      setItems(props.items || []);
      setSelectedIndex(0);
      setOpen(true);
      updatePosition(props.clientRect);
    },
    onUpdate(props) {
      propsRef.current = props;
      setItems(props.items || []);
      setSelectedIndex(0);
      updatePosition(props.clientRect);
    },
    onExit() {
      setOpen(false);
      propsRef.current = null;
    },
    onKeyDown({ event }) {
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  function updatePosition(clientRect) {
    if (!clientRect) return;
    const rect = typeof clientRect === "function" ? clientRect() : clientRect;
    if (!rect) return;
    setPosition({ top: rect.bottom + 6, left: rect.left });
  }

  useEffect(() => {
    commandRef.current = selectItem;
  });

  if (!open || items.length === 0) return null;

  return (
    <div
      className="fixed z-[100] min-w-[220px] max-w-[280px] rounded-lg border bg-popover text-popover-foreground shadow-lg py-1 max-h-[280px] overflow-y-auto"
      style={{ top: position.top, left: position.left }}
      role="listbox"
    >
      {items.map((item, index) => (
        <button
          key={item.title}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          className={cn(
            "w-full text-left px-3 py-2 text-sm transition-colors",
            index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
          )}
          onMouseEnter={() => setSelectedIndex(index)}
          onMouseDown={(e) => {
            e.preventDefault();
            selectItem(index);
          }}
        >
          <span className="font-medium block">{item.title}</span>
          {item.description ? (
            <span className="text-xs text-muted-foreground block truncate">{item.description}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
});
