import { useState } from 'react'
import { Alert } from 'antd'
import AppShell from '@/components/layout/AppShell'
import Badge from '@/components/common/Badge'
import CheckboxFilter from '@/components/common/CheckboxFilter'
import DataTable from '@/components/common/DataTable'
import DateFilter, { dayRange } from '@/components/common/DateFilter'
import SearchInput from '@/components/common/SearchInput'
import { formatDateTime } from '@/utils/format'
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

const toOptions = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }))

const STATUS_OPTIONS = toOptions(Object.fromEntries(Object.entries(STATUSES).map(([k, s]) => [k, s.label])))
const ACTION_OPTIONS = toOptions(ACTIONS)
const DEVICE_TYPE_OPTIONS = toOptions(DEVICE_TYPES)
const allValues = (options) => options.map((o) => o.value)

// Frequent enough to see PENDING actions settle into SUCCESS / FAILED.
const POLL_MS = 3000
const EMPTY_PAGE = { items: [], totalItems: 0 }

const COLUMNS = [
  { title: 'ID', dataIndex: 'id', render: (id) => <span className="text-slate-600">#ACT-{id}</span> },
  { title: 'Device', dataIndex: 'deviceName', render: (name) => <span className="text-base font-semibold">{name}</span> },
  {
    title: 'Device Type',
    dataIndex: 'deviceType',
    render: (type) => (
      <span className="px-3 py-1.5 rounded-md border border-outline bg-slate-50">{DEVICE_TYPES[type] ?? type}</span>
    ),
  },
  { title: 'Action', dataIndex: 'action', render: (a) => <span className="text-base">{ACTIONS[a]}</span> },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (status) => (
      <Badge tone={STATUSES[status].tone} dot>
        {STATUSES[status].label}
      </Badge>
    ),
  },
  {
    title: 'Timestamp',
    dataIndex: 'createdAt',
    key: 'time',
    sorter: true,
    // Repeating 'descend' keeps the column toggling between the two orders instead of clearing the sort.
    sortDirections: ['descend', 'ascend', 'descend'],
    render: (at) => <span className="text-sm text-slate-600 whitespace-nowrap">{formatDateTime(new Date(at))}</span>,
  },
]

export default function History() {
  const [query, setQuery] = useState('')
  const [statuses, setStatuses] = useState(allValues(STATUS_OPTIONS))
  const [actions, setActions] = useState(allValues(ACTION_OPTIONS))
  const [deviceTypes, setDeviceTypes] = useState(allValues(DEVICE_TYPE_OPTIONS))
  const [day, setDay] = useState(null)
  const [newestFirst, setNewestFirst] = useState(true)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Every filter change goes back to the first page.
  const withReset = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  const history = useApi(
    () => {
      // Unticking every option of a filter means "show nothing", while an empty filter means "any" to the API.
      if (statuses.length === 0 || actions.length === 0 || deviceTypes.length === 0) return Promise.resolve(EMPTY_PAGE)
      const unlessAll = (values, options) => (values.length === options.length ? null : values)
      return actionHistoryService.getActionHistories({
        search: query.trim(),
        status: unlessAll(statuses, STATUS_OPTIONS),
        action: unlessAll(actions, ACTION_OPTIONS),
        deviceType: unlessAll(deviceTypes, DEVICE_TYPE_OPTIONS),
        ...dayRange(day),
        newestFirst,
        page,
        size: rowsPerPage,
      })
    },
    [query, statuses, actions, deviceTypes, day, newestFirst, page, rowsPerPage],
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
        <SearchInput value={query} onChange={withReset(setQuery)} placeholder="Device or time (HH:mm:ss)" />
        <CheckboxFilter label="Status" options={STATUS_OPTIONS} value={statuses} onChange={withReset(setStatuses)} />
        <CheckboxFilter label="Action" options={ACTION_OPTIONS} value={actions} onChange={withReset(setActions)} />
        <CheckboxFilter
          label="Device Type"
          options={DEVICE_TYPE_OPTIONS}
          value={deviceTypes}
          onChange={withReset(setDeviceTypes)}
        />
        <DateFilter value={day} onChange={withReset(setDay)} />
      </div>

      {history.error && <Alert type="error" showIcon title={`Could not load history: ${history.error.message}`} />}

      <DataTable
        columns={COLUMNS.map((c) => (c.key === 'time' ? { ...c, sortOrder: newestFirst ? 'descend' : 'ascend' } : c))}
        rows={rows}
        loaded={!history.loading}
        emptyText="No actions match these filters."
        page={page}
        rowsPerPage={rowsPerPage}
        total={totalItems}
        onPageChange={setPage}
        onRowsPerPageChange={withReset(setRowsPerPage)}
        onChange={(_pagination, _filters, sorter) => withReset(setNewestFirst)(sorter.order !== 'ascend')}
      />
    </AppShell>
  )
}
