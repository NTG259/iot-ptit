import { useRef } from 'react'
import { Pagination, Table } from 'antd'

const CLASS_NAMES = {
  header: { cell: 'tracking-[0.12em] uppercase text-sm font-medium whitespace-nowrap' },
}

/**
 * Server-paginated table that fills its panel: the rows scroll under a sticky header
 * and the pagination bar stays pinned below them.
 */
export default function DataTable({
  columns,
  rows,
  loaded,
  emptyText,
  page,
  rowsPerPage,
  total,
  noun = 'entries',
  rowsOptions = [10, 20, 50],
  onPageChange,
  onRowsPerPageChange,
  onChange,
}) {
  const scrollRef = useRef(null)
  const from = total === 0 ? 0 : (page - 1) * rowsPerPage + 1
  const to = Math.min(total, page * rowsPerPage)

  return (
    <section className="panel flex-1 min-h-0 overflow-hidden flex flex-col">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={!loaded}
          pagination={false}
          sticky={{ getContainer: () => scrollRef.current }}
          locale={{ emptyText: loaded ? emptyText : ' ' }}
          classNames={CLASS_NAMES}
          onChange={onChange}
        />
      </div>

      <div className="flex flex-wrap items-center shrink-0 gap-4 px-5 py-3 border-t border-outline text-muted">
        <span>
          Showing <span className="text-text">{from}–{to}</span> of{' '}
          <span className="text-text">{total.toLocaleString('en-US')}</span> {noun}
        </span>
        <Pagination
          className="ml-auto"
          current={page}
          pageSize={rowsPerPage}
          total={total}
          showSizeChanger
          pageSizeOptions={rowsOptions}
          onChange={(nextPage, nextSize) => (nextSize === rowsPerPage ? onPageChange(nextPage) : onRowsPerPageChange(nextSize))}
        />
      </div>
    </section>
  )
}
