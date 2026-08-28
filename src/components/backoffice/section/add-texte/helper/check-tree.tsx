import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { CheckNodeProps, CheckTreeProps } from "../types/types"

function CheckNode({ item, selected, onToggle, depth }: CheckNodeProps) {
  const [open, setOpen] = useState<boolean>(true)
  const hasChildren = item.children && item.children.length > 0
  const checked: boolean = selected.has(item.id)

  // état intermédiaire : certains enfants cochés mais pas tous
  const someChildChecked: boolean = hasChildren
    ? item.children!.some((c) => selected.has(c.id))
    : false
  const indeterminate: boolean = someChildChecked && !checked
  const checkboxRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <div>
      <div
        className={[
          "group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
          checked || someChildChecked ? "bg-cyan-50" : "hover:bg-slate-50",
        ].join(" ")}
        style={{ paddingLeft: depth * 16 + 8 }}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 hover:text-cyan-700"
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        )}
        {!hasChildren && <span className="h-4 w-4 shrink-0" />}

        <input
          type="checkbox"
          id={item.id}
          checked={checked}
          ref={checkboxRef}
          onChange={() => onToggle(item.id)}
          className="h-4 w-4 shrink-0 rounded border-slate-300 text-cyan-700 accent-cyan-700 focus:ring-cyan-700/30"
        />
        <span
          className={[
            "text-sm leading-snug select-none",
            depth === 0 ? "font-medium text-slate-800" : "text-slate-600",
            checked ? "text-cyan-800" : "",
          ].join(" ")}
        >
          {item.label}
        </span>
      </div>

      {hasChildren && open && (
        <div>
          {item.children!.map((child) => (
            <CheckNode
              key={child.id}
              item={child}
              selected={selected}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CheckTree ────────────────────────────────────────────────────────────────

function CheckTree({ items, selected, onToggle, depth = 0 }: CheckTreeProps) {
  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <CheckNode
          key={item.id}
          item={item}
          selected={selected}
          onToggle={onToggle}
          depth={depth}
        />
      ))}
    </div>
  )
}

export { CheckTree }