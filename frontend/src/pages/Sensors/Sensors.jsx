import { useState } from 'react'
import { LuRefreshCw, LuArrowUpDown } from 'react-icons/lu'
import AppShell from '@/components/layout/AppShell/AppShell'
import Badge from '@/components/common/Badge/Badge'
import FilterMenu from '@/components/common/FilterMenu/FilterMenu'
import Pagination from '@/components/common/Pagination/Pagination'
import SearchInput from '@/components/common/SearchInput/SearchInput'
import { TH_CLASS, TD_CLASS } from '@/components/common/Table/tableStyles'
import { formatUtcIso } from '@/utils/format'
import { sensorService } from '@/services'
import useApi from '@/hooks/useApi'

// Keyed by the backend SensorType enum; the unit itself comes from the API.
const TYPES = {
  TEMPERATURE: { label: 'Temperature', tone: 'green', unitClass: 'text-primary', decimals: 1 },
  HUMIDITY: { label: 'Moisture', tone: 'cyan', unitClass: 'text-cyan-600', decimals: 0 },
  LIGHT: { label: 'Light', tone: 'orange', unitClass: 'text-muted', decimals: 0 },
}

const STATUSES = {
  ACTIVE: { label: 'Active', tone: 'green' },
  STANDBY: { label: 'Standby', tone: 'gray' },
  OFFLINE: { label: 'Offline', tone: 'red' },
}

const TYPE_OPTIONS = Object.entries(TYPES).map(([value, t]) => ({ value, label: t.label }))
const STATUS_OPTIONS = [{ value: 'all', label: 'All' }, ...Object.entries(STATUSES).map(([value, s]) => ({ value, label: s.label }))]
const TIME_OPTIONS = [
  { value: 'all', label: 'Any time', maxAgeMs: null },
  { value: '5m', label: 'Last 5 minutes', maxAgeMs: 5 * 60_000 },
  { value: '1h', label: 'Last hour', maxAgeMs: 60 * 60_000 },
]

const POLL_MS = 5000
const EMPTY_PAGE = { items: [], totalItems: 0 }

export default function Sensors() {
  const [query, setQuery] = useState('')
  const [types, setTypes] = useState(Object.keys(TYPES))
  const [status, setStatus] = useState('all')
  const [time, setTime] = useState('all')
  const [newestFirst, setNewestFirst] = useState(true)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(8)

  const withReset = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  const sensors = useApi(
    () => {
      // Unticking every type means "show nothing", while an empty filter means "all" to the API.
      if (types.length === 0) return Promise.resolve(EMPTY_PAGE)
      const maxAgeMs = TIME_OPTIONS.find((o) => o.value === time).maxAgeMs
      return sensorService.getSensors({
        search: query.trim(),
        types: types.length === TYPE_OPTIONS.length ? null : types,
        status,
        updatedSince: maxAgeMs ? new Date(Date.now() - maxAgeMs).toISOString() : null,
        newestFirst,
        page,
        size: rowsPerPage,
      })
    },
    [query, types, status, time, newestFirst, page, rowsPerPage],
    { intervalMs: POLL_MS },
  )
  const { items: rows, totalItems } = sensors.data ?? EMPTY_PAGE

  return (
    <AppShell breadcrumb="Sensors" title="Sensor Management" subtitle="Monitor real-time environmental metrics across zones.">
      <div className="panel shrink-0 p-3 flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={withReset(setQuery)} shortcut />
        <FilterMenu
          label={`Type: ${types.length === TYPE_OPTIONS.length ? 'All' : 'Custom'} (${types.length})`}
          options={TYPE_OPTIONS}
          value={types}
          onChange={withReset(setTypes)}
          multiple
          menuTitle="FILTER BY TYPE"
        />
        <FilterMenu
          label={
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status === 'all' ? 'bg-green' : 'bg-slate-400'}`} />
              Status: {STATUS_OPTIONS.find((o) => o.value === status).label}
            </span>
          }
          options={STATUS_OPTIONS}
          value={status}
          onChange={withReset(setStatus)}
        />
        <FilterMenu
          label={time === 'all' ? 'Date time' : TIME_OPTIONS.find((o) => o.value === time).label}
          options={TIME_OPTIONS}
          value={time}
          onChange={withReset(setTime)}
        />
        <button
          type="button"
          onClick={sensors.reload}
          className="flex items-center gap-2 h-10 px-4 rounded-lg border border-outline bg-white text-[0.9375rem] text-text cursor-pointer hover:bg-canvas"
        >
          <LuRefreshCw className="w-4 h-4 text-muted" />
          Refresh
        </button>
      </div>

      {sensors.error && <p className="m-0 shrink-0 px-4 py-2.5 rounded-lg bg-red/10 text-red text-sm">Could not load sensors: {sensors.error.message}</p>}

      <section className="panel flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH_CLASS}>Sensor ID</th>
                <th className={TH_CLASS}>Sensor Name</th>
                <th className={TH_CLASS}>Sensor Type</th>
                <th className={TH_CLASS}>Status</th>
                <th className={TH_CLASS}>Current Reading</th>
                <th className={TH_CLASS} aria-sort={newestFirst ? 'descending' : 'ascending'}>
                  <button
                    type="button"
                    onClick={() => withReset(setNewestFirst)(!newestFirst)}
                    className="flex items-center gap-3 font-[inherit] tracking-[inherit] uppercase cursor-pointer"
                  >
                    Timestamp (UTC)
                    <LuArrowUpDown className="w-4 h-4 text-slate-400" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const t = TYPES[s.type]
                const st = STATUSES[s.status]
                return (
                  <tr key={s.id} className="hover:bg-canvas/60">
                    <td className={`${TD_CLASS} tabular-nums font-semibold text-text`}>#{s.code}</td>
                    <td className={`${TD_CLASS} text-[0.9375rem] font-medium text-text whitespace-nowrap`}>{s.name}</td>
                    <td className={TD_CLASS}>
                      <Badge tone={t.tone}>{t.label}</Badge>
                    </td>
                    <td className={TD_CLASS}>
                      <Badge tone={st.tone} dot>
                        {st.label}
                      </Badge>
                    </td>
                    <td className={`${TD_CLASS} whitespace-nowrap`}>
                      {s.lastValue == null ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <>
                          <span className="tabular-nums text-lg font-semibold text-text">{s.lastValue.toFixed(t.decimals)}</span>
                          <span className={`ml-1 tabular-nums text-sm ${t.unitClass}`}>{s.unit}</span>
                        </>
                      )}
                    </td>
                    <td className={`${TD_CLASS} tabular-nums text-sm text-slate-600 whitespace-nowrap`}>
                      {s.lastReadingAt ? formatUtcIso(new Date(s.lastReadingAt)) : '—'}
                    </td>
                  </tr>
                )
              })}
              {sensors.data && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className={`${TD_CLASS} text-center text-muted`}>
                    No sensors match these filters.
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
          noun="sensors"
          rowsOptions={[8, 10, 20]}
          onPageChange={setPage}
          onRowsPerPageChange={withReset(setRowsPerPage)}
        />
      </section>
    </AppShell>
  )
}
