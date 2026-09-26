import { useEffect, useRef } from 'react'
import { LuSearch } from 'react-icons/lu'

/** Toolbar search box. With `shortcut`, Ctrl/⌘+K focuses it from anywhere on the page. */
export default function SearchInput({ value, onChange, placeholder, shortcut = false }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (!shortcut) return
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [shortcut])

  return (
    <label className="flex-1 min-w-[15rem] flex items-center gap-3 h-10 px-4 border border-outline rounded-lg bg-canvas/60 focus-within:border-primary-line focus-within:bg-white">
      <LuSearch className="w-5 h-5 text-slate-400 shrink-0" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent outline-none text-[0.9375rem] text-text placeholder:text-slate-400"
      />
      {shortcut && (
        <kbd className="px-1.5 py-0.5 rounded border border-outline bg-white tabular-nums text-xs text-muted">⌘K</kbd>
      )}
    </label>
  )
}
