import { useState } from 'react'
import { Alert, Button } from 'antd'
import { LuRefreshCw } from 'react-icons/lu'
import AppShell from '@/components/layout/AppShell'
import Badge from '@/components/common/Badge'
import CheckboxFilter from '@/components/common/CheckboxFilter'
import DataTable from '@/components/common/DataTable'
import DateFilter, { dayRange } from '@/components/common/DateFilter'
import SearchInput from '@/components/common/SearchInput'
import { formatDateTime } from '@/utils/format'
import { sensorService } from '@/services'
import useApi from '@/hooks/useApi'

// Keyed by the backend SensorType enum; the unit itself comes from the API.
const TYPES = {
  TEMPERATURE: { label: 'Temperature', tone: 'green', unitClass: 'text-primary', decimals: 1 },
  HUMIDITY: { label: 'Humidity', tone: 'cyan', unitClass: 'text-cyan-600', decimals: 1 },
  LIGHT: { label: 'Light', tone: 'orange', unitClass: 'text-muted', decimals: 0 },
}

// Order of the Sensor Type filter, as in the design.
const TYPE_OPTIONS = ['TEMPERATURE', 'LIGHT', 'HUMIDITY'].map((value) => ({ value, label: TYPES[value].label }))

const COLUMNS = [
  { title: 'ID', dataIndex: 'id', render: (id) => <span className="font-semibold">#{id}</span> },
  { title: 'Sensor', dataIndex: 'sensorName', render: (name) => <span className="font-medium whitespace-nowrap">{name}</span> },
  { title: 'Sensor Type', dataIndex: 'sensorType', render: (type) => <Badge tone={TYPES[type].tone}>{TYPES[type].label}</Badge> },
  {
    title: 'Value',
    dataIndex: 'value',
    render: (value, r) => {
      const t = TYPES[r.sensorType]
      return (
        <span className="whitespace-nowrap">
          <span className="text-lg font-semibold">{value.toFixed(t.decimals)}</span>
          <span className={`ml-1 text-sm ${t.unitClass}`}>{r.unit}</span>
        </span>
      )
    },
  },
  {
    title: 'Timestamp',
    dataIndex: 'measuredAt',
    key: 'time',
    sorter: true,
    // Repeating 'descend' keeps the column toggling between the two orders instead of clearing the sort.
    sortDirections: ['descend', 'ascend', 'descend'],
    render: (at) => <span className="text-sm text-slate-600 whitespace-nowrap">{formatDateTime(new Date(at))}</span>,
  },
]

// The ESP8266 publishes every 2s, so poll at the same pace to show each new reading.
const POLL_MS = 2000
const EMPTY_PAGE = { items: [], totalItems: 0 }

export default function Sensors() {
  const [query, setQuery] = useState('')
  const [types, setTypes] = useState(Object.keys(TYPES))
  // One day (Vietnam time); the search box then narrows it to a time such as 17:20 or 17:20:05.
  const [day, setDay] = useState(null)
  const [newestFirst, setNewestFirst] = useState(true)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const allTypes = types.length === TYPE_OPTIONS.length

  const withReset = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  const readings = useApi(
    () => {
      // Unticking every type means "show nothing", while an empty filter means "all" to the API.
      if (types.length === 0) return Promise.resolve(EMPTY_PAGE)
      return sensorService.getReadings({
        search: query.trim(),
        types: allTypes ? null : types,
        ...dayRange(day),
        newestFirst,
        page,
        size: rowsPerPage,
      })
    },
    [query, types, day, newestFirst, page, rowsPerPage],
    { intervalMs: POLL_MS },
  )
  const { items: rows, totalItems } = readings.data ?? EMPTY_PAGE

  return (
    <AppShell breadcrumb="Sensors" title="Sensor Data" subtitle="Sensor reading history, updated every 2 seconds.">
      <div className="panel shrink-0 p-3 flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={withReset(setQuery)} placeholder="Sensor, value or time (HH:mm:ss)" />
        <CheckboxFilter label="Sensor Type" options={TYPE_OPTIONS} value={types} onChange={withReset(setTypes)} />
        <DateFilter value={day} onChange={withReset(setDay)} />
        <Button icon={<LuRefreshCw className="w-4 h-4 text-muted" />} onClick={readings.reload}>
          Refresh
        </Button>
      </div>

      {readings.error && <Alert type="error" showIcon title={`Could not load sensor data: ${readings.error.message}`} />}

      <DataTable
        columns={COLUMNS.map((c) => (c.key === 'time' ? { ...c, sortOrder: newestFirst ? 'descend' : 'ascend' } : c))}
        rows={rows}
        loaded={!readings.loading}
        emptyText="No readings match these filters."
        page={page}
        rowsPerPage={rowsPerPage}
        total={totalItems}
        noun="readings"
        rowsOptions={[10, 20, 50]}
        onPageChange={setPage}
        onRowsPerPageChange={withReset(setRowsPerPage)}
        onChange={(_pagination, _filters, sorter) => withReset(setNewestFirst)(sorter.order !== 'ascend')}
      />
    </AppShell>
  )
}
