import { useEffect, useRef, useState } from 'react'
import { LuChevronDown, LuCheck } from 'react-icons/lu'

/**
 * Toolbar dropdown. Single-select by default (`value` is one option value);
 * with `multiple`, `value` is an array and the menu shows checkboxes plus "Select All".
 */
export default function FilterMenu({ icon: Icon, label, options, value, onChange, multiple = false, menuTitle }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const isSelected = (optionValue) => (multiple ? value.includes(optionValue) : value === optionValue)

  const select = (optionValue) => {
    if (!multiple) {
      onChange(optionValue)
      setOpen(false)
      return
    }
    onChange(isSelected(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue])
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-10 px-4 border border-outline rounded-lg bg-white text-[0.9375rem] text-text whitespace-nowrap cursor-pointer hover:bg-canvas"
      >
        {Icon && <Icon className="w-4 h-4 text-muted" />}
        {label}
        <LuChevronDown className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable={multiple}
          className="absolute right-0 top-full mt-2 z-20 min-w-[15rem] p-2 border border-outline rounded-xl bg-white shadow-lg"
        >
          {multiple && (
            <div className="flex items-center justify-between px-3 pt-1 pb-2 mb-1 border-b border-outline tabular-nums text-xs tracking-[0.1em]">
              <span className="text-muted">{menuTitle}</span>
              <button
                type="button"
                className="font-semibold text-primary cursor-pointer"
                onClick={() => onChange(options.map((o) => o.value))}
              >
                Select All
              </button>
            </div>
          )}

          {options.map((option) => {
            const selected = isSelected(option.value)
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => select(option.value)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-[0.9375rem] text-text cursor-pointer hover:bg-canvas"
              >
                {multiple ? (
                  <span
                    className={`grid place-items-center w-5 h-5 rounded border ${
                      selected ? 'bg-primary border-primary text-white' : 'border-slate-300'
                    }`}
                  >
                    {selected && <LuCheck className="w-3.5 h-3.5" />}
                  </span>
                ) : (
                  <LuCheck className={`w-4 h-4 text-primary ${selected ? '' : 'invisible'}`} />
                )}
                {option.label}
                {option.hint && <span className="ml-auto tabular-nums text-xs text-muted">{option.hint}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
