import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'

// First pages, current neighbourhood and last page, with gaps collapsed to '…'.
function pageItems(page, pageCount) {
  const pages = new Set([1, 2, 3, page - 1, page, page + 1, pageCount])
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b)
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['gap-' + p, p] : [p]))
}

const ARROW_CLASS =
  'grid place-items-center w-9 h-9 rounded-lg border border-outline bg-white text-text cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

export default function Pagination({ page, rowsPerPage, total, noun = 'entries', rowsOptions = [10, 20, 50], onPageChange, onRowsPerPageChange }) {
  const pageCount = Math.max(1, Math.ceil(total / rowsPerPage))
  const from = total === 0 ? 0 : (page - 1) * rowsPerPage + 1
  const to = Math.min(total, page * rowsPerPage)

  return (
    <div className="flex flex-wrap items-center shrink-0 gap-4 px-5 py-3 border-t border-outline text-[0.9375rem] text-muted">
      <span>
        Showing{' '}
        <span className="text-text">
          {from}–{to}
        </span>{' '}
        of <span className="text-text">{total.toLocaleString('en-US')}</span> {noun}
      </span>
      <span className="h-8 w-px bg-outline" />
      <label className="flex items-center gap-2">
        Rows:
        <select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
          className="h-9 px-2 rounded-lg border border-outline bg-white tabular-nums text-sm text-text"
        >
          {rowsOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <nav className="ml-auto flex items-center gap-2" aria-label="Pagination">
        <button type="button" className={ARROW_CLASS} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <LuChevronLeft className="w-4 h-4" />
        </button>
        {pageItems(page, pageCount).map((item) =>
          typeof item === 'string' ? (
            <span key={item} className="px-2 text-slate-400">
              ···
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={`min-w-9 h-9 px-3 rounded-lg text-[0.9375rem] font-medium cursor-pointer ${
                item === page ? 'bg-primary text-white' : 'text-text hover:bg-canvas'
              }`}
            >
              {item}
            </button>
          ),
        )}
        <button type="button" className={ARROW_CLASS} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <LuChevronRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  )
}
