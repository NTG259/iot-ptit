import { useState } from 'react'
import { LuCopy, LuCheck } from 'react-icons/lu'

export default function CopyableTimestamp({ value }) {
  const [copied, setCopied] = useState(false)

  function handleCopy(e) {
    e.stopPropagation()
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <span className="data-table__timestamp-cell">
      <span className="data-table__timestamp">{value}</span>
      <button
        type="button"
        className={`data-table__copy-btn${copied ? ' data-table__copy-btn--copied' : ''}`}
        onClick={handleCopy}
        title="Copy timestamp"
        aria-label="Copy timestamp"
      >
        {copied ? <LuCheck size={12} /> : <LuCopy size={12} />}
      </button>
    </span>
  )
}
