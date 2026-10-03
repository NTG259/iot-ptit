import { useEffect, useRef } from 'react'
import { Input } from 'antd'
import { LuSearch } from 'react-icons/lu'

/** Toolbar search box. With `shortcut`, Ctrl/⌘+K focuses it from anywhere on the page. */
export default function SearchInput({ value, onChange, placeholder = 'Search', shortcut = false }) {
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
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      allowClear
      prefix={<LuSearch className="w-4 h-4 text-slate-400" />}
      suffix={shortcut && <kbd className="px-1.5 py-0.5 rounded border border-outline bg-white text-xs text-muted">⌘K</kbd>}
      className="flex-1 min-w-[15rem]"
    />
  )
}
