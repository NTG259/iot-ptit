import { useState } from 'react'
import AppShell from '@/components/layout/AppShell/AppShell'
import Badge from '@/components/common/Badge/Badge'
import FilterMenu from '@/components/common/FilterMenu/FilterMenu'
import Pagination from '@/components/common/Pagination/Pagination'
import SearchInput from '@/components/common/SearchInput/SearchInput'
import { TH_CLASS, TD_CLASS } from '@/components/common/Table/tableStyles'
import { formatUtcLong } from '@/utils/format'
import { actionHistoryService } from '@/services'
import useApi from '@/hooks/useApi'

// Keyed by the backend enums.
const STATUSES = {
  SUCCESS: { label: 'Success', tone: 'green' },
  PENDING: { label: 'Pending', tone: 'blue' },
  FAILED: { label: 'Failed', tone: 'red' },
}
const ACTIONS = { TURN_ON: 'Turn ON', TURN_OFF: 'Turn OFF' }
const DEVICE_TYPES = { SMART_LED: 'Smart LED' }

const withAll = (labels) => [{ value: 'all', label: 'All' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]

const STATUS_OPTIONS = withAll(Object.fromEntries(Object.entries(STATUSES).map(([k, s]) => [k, s.label])))
const ACTION_OPTIONS = withAll(ACTIONS)
const DEVICE_TYPE_OPTIONS = withAll(DEVICE_TYPES)
const DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: 'all', label: 'All time' },
]

const DAY_MS = 24 * 60 * 60 * 1000
// Frequent enough to see PENDING actions settle into SUCCESS / FAILED.
const POLL_MS = 3000
const EMPTY_PAGE = { items: [], totalItems: 0 }

function rangeStart(range) {
  if (range === 'all') return null
  if (range === '7d') return new Date(Date.now() - 7 * DAY_MS).toISOString()
  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)
  return midnight.toISOString()
}

const labelOf = (options, value) => options.find((o) => o.value === value).label

export default function History() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [action, setAction] = useState('all')
  const [deviceType, setDeviceType] = useState('all')
  const [range, setRange] = useState('today')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Every filter change goes back to the first page.
  const withReset = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  const history = useApi(
    () =>
      actionHistoryService.getActionHistories({
        search: query.trim(),
        status,
        action,
        deviceType,
        from: rangeStart(range),
        page,
        size: rowsPerPage,
      }),
    [query, status, action, deviceType, range, page, rowsPerPage],
    { intervalMs: POLL_MS },
  )
  const { items: rows, totalItems } = history.data ?? EMPTY_PAGE

  return (
    <AppShell
      breadcrumb="History"
      title="Action History"
      subtitle="Real-time audit telemetry and automated action dispatch log across mesh nodes."
    >
      <div className="panel shrink-0 p-3 flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={withReset(setQuery)} placeholder="Search LED by code or name..." />
        <FilterMenu
          label={`Status: ${labelOf(STATUS_OPTIONS, status)}`}
          options={STATUS_OPTIONS}
          value={status}
          onChange={withReset(setStatus)}
        />
        <FilterMenu
          label={`Action: ${labelOf(ACTION_OPTIONS, action)}`}
          options={ACTION_OPTIONS}
          value={action}
          onChange={withReset(setAction)}
        />
        <FilterMenu
          label={`Device Type: ${labelOf(DEVICE_TYPE_OPTIONS, deviceType)}`}
          options={DEVICE_TYPE_OPTIONS}
          value={deviceType}
          onChange={withReset(setDeviceType)}
        />
        <FilterMenu
          label={labelOf(DATE_OPTIONS, range)}
          options={DATE_OPTIONS}
          value={range}
          onChange={withReset(setRange)}
        />
      </div>

      {history.error && <p className="m-0 shrink-0 px-4 py-2.5 rounded-lg bg-red/10 text-red text-sm">Could not load history: {history.error.message}</p>}

      <section className="panel flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH_CLASS}>Event ID</th>
                <th className={TH_CLASS}>Device</th>
                <th className={TH_CLASS}>Device Type</th>
                <th className={TH_CLASS}>Action Performed</th>
                <th className={TH_CLASS}>Status</th>
                <th className={`${TH_CLASS} text-right`}>Timestamp (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-canvas/60">
                  <td className={`${TD_CLASS} tabular-nums text-slate-600`}>#ACT-{row.id}</td>
                  <td className={`${TD_CLASS} text-base font-semibold text-text`}>{row.deviceName}</td>
                  <td className={TD_CLASS}>
                    <span className="px-3 py-1.5 rounded-md border border-outline bg-slate-50 text-[0.9375rem] text-text">
                      {DEVICE_TYPES[row.deviceType] ?? row.deviceType}
                    </span>
                  </td>
                  <td className={`${TD_CLASS} text-base text-text`}>{ACTIONS[row.action]}</td>
                  <td className={TD_CLASS}>
                    <Badge tone={STATUSES[row.status].tone} dot>
                      {STATUSES[row.status].label}
                    </Badge>
                  </td>
                  <td className={`${TD_CLASS} text-right tabular-nums text-slate-600 whitespace-nowrap`}>
                    {formatUtcLong(new Date(row.createdAt))}
                  </td>
                </tr>
              ))}
              {history.data && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className={`${TD_CLASS} text-center text-muted`}>
                    No actions match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          rowsPerPage={rowsPerPage}
          total={totalItems}
          onPageChange={setPage}
          onRowsPerPageChange={withReset(setRowsPerPage)}
        />
      </section>
    </AppShell>
  )
}
