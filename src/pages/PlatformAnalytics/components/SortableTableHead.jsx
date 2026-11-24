import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Clickable column header. First click uses `defaultOrder`; another click flips direction.
 * @param {{
 *   label: string,
 *   sortKey: string,
 *   sort: string,
 *   order: "asc"|"desc",
 *   defaultOrder?: "asc"|"desc",
 *   onSort: (sortKey: string, defaultOrder: "asc"|"desc") => void,
 *   align?: "left"|"right",
 * }} props
 */
export function SortableTableHead({
  label,
  sortKey,
  sort,
  order,
  defaultOrder = "desc",
  onSort,
  align = "left",
}) {
  const isActive = sort === sortKey;
  const SortIcon = isActive ? (order === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={cn(align === "right" && "text-right")}>
      <button
        type="button"
        onClick={() => onSort(sortKey, defaultOrder)}
        className={cn(
          "inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground",
          align === "right" && "w-full justify-end text-right",
        )}
      >
        {label}
        <SortIcon
          className={isActive ? "size-3.5 text-foreground" : "size-3.5 text-muted-foreground/70"}
          aria-hidden
        />
        <span className="sr-only">
          {isActive ? `Sorted ${order === "asc" ? "ascending" : "descending"}` : `Sort by ${label}`}
        </span>
      </button>
    </TableHead>
  );
}

/** @param {string} currentKey @param {"asc"|"desc"} currentOrder @param {string} nextKey @param {"asc"|"desc"} defaultOrder */
export function nextColumnSort(currentKey, currentOrder, nextKey, defaultOrder = "desc") {
  if (currentKey === nextKey) {
    return { sort: currentKey, order: currentOrder === "asc" ? "desc" : "asc" };
  }
  return { sort: nextKey, order: defaultOrder };
}
