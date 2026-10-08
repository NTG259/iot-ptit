import { useState } from 'react'
import { Alert, DatePicker, Input, Select, Space } from 'antd'
import { LuSearch } from 'react-icons/lu'
import AppShell from '@/components/layout/AppShell'
import CheckboxFilter from '@/components/common/CheckboxFilter'
import Badge from '@/components/common/Badge'
import DataTable from '@/components/common/DataTable'
import { formatDateTime, dayRange } from '@/utils/format'
import { actionHistoryService } from '@/services'
import useApi from '@/hooks/useApi'
import './History.css'

// Nhãn và màu hiển thị trong bảng.
const STATUS_DISPLAY = {
  SUCCESS: { label: 'Success', tone: 'green' },
  PENDING: { label: 'Pending', tone: 'blue' },
  FAILED: { label: 'Failed', tone: 'red' },
}
const ACTION_LABELS = { TURN_ON: 'Turn ON', TURN_OFF: 'Turn OFF' }
const DEVICE_TYPE_LABELS = { SMART_LED: 'Smart LED' }

// Các ô tick của ba bộ lọc.
const STATUS_OPTIONS = [
  { value: 'SUCCESS', label: 'Success' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
]
const ACTION_OPTIONS = [
  { value: 'TURN_ON', label: 'Turn ON' },
  { value: 'TURN_OFF', label: 'Turn OFF' },
]
const DEVICE_TYPE_OPTIONS = [{ value: 'SMART_LED', label: 'Smart LED' }]

// Các trường mà ô tìm kiếm có thể so khớp.
const SEARCH_FIELDS = [
  { value: 'NAME', label: 'Name' },
  { value: 'TYPE', label: 'Type' },
  { value: 'TIME', label: 'Date time' },
]

// Gợi ý nhập trong ô tìm kiếm, theo trường đang chọn.
function getSearchPlaceholder(searchField) {
  if (searchField === 'NAME') {
    return 'Device name'
  }
  if (searchField === 'TYPE') {
    return 'Smart LED'
  }
  return '2026-10-03 17:20 or 17:20:05'
}

// Trang kết quả rỗng, dùng khi chưa tải xong hoặc khi bỏ tick hết một bộ lọc.
const EMPTY_PAGE = { items: [], totalItems: 0 }

const COLUMNS = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Device', dataIndex: 'deviceName', render: (name) => <span className="history__device-name">{name}</span> },
  {
    title: 'Device Type',
    dataIndex: 'deviceType',
    render: (type) => {
      const typeLabel = DEVICE_TYPE_LABELS[type] ?? type
      return <span className="history__device-type">{typeLabel}</span>
    },
  },
  { title: 'Action', dataIndex: 'action', render: (action) => <span className="history__action">{ACTION_LABELS[action]}</span> },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (status) => (
      <Badge tone={STATUS_DISPLAY[status].tone} dot>
        {STATUS_DISPLAY[status].label}
      </Badge>
    ),
  },
  {
    title: 'Timestamp',
    dataIndex: 'createdAt',
    render: (createdAt) => <span className="data-table__timestamp">{formatDateTime(new Date(createdAt))}</span>,
  },
]

/**
 * History: trang lịch sử bật/tắt thiết bị (action history).
 * - Thanh công cụ: tìm theo tên, loại thiết bị hoặc ngày giờ (chọn trường ở ô dropdown bên cạnh), lọc theo
 *   Status / Action / Device Type và theo ngày. Mọi thay đổi bộ lọc đều quay về trang 1.
 * - Bỏ tick hết một bộ lọc nghĩa là "không hiện gì"; còn tick đủ tất cả thì không gửi bộ lọc đó (API hiểu là "mọi giá trị").
 * - Poll mỗi 3s để thấy các lệnh PENDING chuyển sang SUCCESS / FAILED.
 */
export default function History() {
  const [searchText, setSearchText] = useState('')
  const [searchField, setSearchField] = useState('NAME')
  const [selectedStatuses, setSelectedStatuses] = useState(['SUCCESS', 'PENDING', 'FAILED'])
  const [selectedActions, setSelectedActions] = useState(['TURN_ON', 'TURN_OFF'])
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState(['SMART_LED'])
  const [selectedDate, setSelectedDate] = useState(null)
  const [newestFirst, setNewestFirst] = useState(true)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Tải bảng lịch sử, tự tải lại mỗi 3s. Bỏ tick hết một bộ lọc thì không hiện gì; tick đủ tất cả thì không gửi bộ lọc đó.
  const historyRequest = useApi(
    () => {
      const anyFilterEmpty = selectedStatuses.length === 0 || selectedActions.length === 0 || selectedDeviceTypes.length === 0
      if (anyFilterEmpty) {
        return Promise.resolve(EMPTY_PAGE)
      }
      const allStatusesSelected = selectedStatuses.length === STATUS_OPTIONS.length
      const allActionsSelected = selectedActions.length === ACTION_OPTIONS.length
      const allDeviceTypesSelected = selectedDeviceTypes.length === DEVICE_TYPE_OPTIONS.length
      const { from, to } = dayRange(selectedDate)
      return actionHistoryService.getActionHistory({
        search: searchText.trim(),
        searchBy: searchField,
        status: allStatusesSelected ? null : selectedStatuses,
        action: allActionsSelected ? null : selectedActions,
        deviceType: allDeviceTypesSelected ? null : selectedDeviceTypes,
        from,
        to,
        newestFirst,
        page,
        size: rowsPerPage,
      })
    },
    [searchText, searchField, selectedStatuses, selectedActions, selectedDeviceTypes, selectedDate, newestFirst, page, rowsPerPage],
    { intervalMs: 3000, initialData: EMPTY_PAGE },
  )
  const { items: rows, totalItems: totalRows } = historyRequest.data

  // Đổi bộ lọc nào cũng quay về trang 1.
  function handleSearchFieldChange(newField) {
    setSearchField(newField)
    setSearchText('')
    setPage(1)
  }
  function handleSearchTextChange(event) {
    setSearchText(event.target.value)
    setPage(1)
  }
  function handleStatusesChange(newStatuses) {
    setSelectedStatuses(newStatuses)
    setPage(1)
  }
  function handleActionsChange(newActions) {
    setSelectedActions(newActions)
    setPage(1)
  }
  function handleDeviceTypesChange(newDeviceTypes) {
    setSelectedDeviceTypes(newDeviceTypes)
    setPage(1)
  }
  function handleDateChange(newDate) {
    setSelectedDate(newDate)
    setPage(1)
  }
  function handleRowsPerPageChange(newRowsPerPage) {
    setRowsPerPage(newRowsPerPage)
    setPage(1)
  }
  function handleNewestFirstChange(newValue) {
    setNewestFirst(newValue)
    setPage(1)
  }

  return (
    <AppShell
      breadcrumb="History"
      title="Action History"
      subtitle="Real-time audit telemetry and automated action dispatch log across mesh nodes."
    >
      <div className="panel toolbar">
        <Space.Compact>
          <Select value={searchField} options={SEARCH_FIELDS} onChange={handleSearchFieldChange} style={{ width: 120 }} />
          <Input
            allowClear
            prefix={<LuSearch size="1rem" color="var(--color-muted)" />}
            placeholder={getSearchPlaceholder(searchField)}
            value={searchText}
            onChange={handleSearchTextChange}
            style={{ width: 240 }}
          />
        </Space.Compact>
        <CheckboxFilter label="Status" options={STATUS_OPTIONS} value={selectedStatuses} onChange={handleStatusesChange} />
        <CheckboxFilter label="Action" options={ACTION_OPTIONS} value={selectedActions} onChange={handleActionsChange} />
        <CheckboxFilter label="Device Type" options={DEVICE_TYPE_OPTIONS} value={selectedDeviceTypes} onChange={handleDeviceTypesChange} />
        <DatePicker value={selectedDate} onChange={handleDateChange} />
      </div>

      {historyRequest.error && <Alert type="error" showIcon title={`Could not load history: ${historyRequest.error.message}`} />}

      <DataTable
        columns={COLUMNS}
        sortColumn="createdAt"
        rows={rows}
        loaded={!historyRequest.loading}
        emptyText="No actions match these filters."
        page={page}
        rowsPerPage={rowsPerPage}
        total={totalRows}
        onPageChange={setPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        newestFirst={newestFirst}
        onNewestFirstChange={handleNewestFirstChange}
      />
    </AppShell>
  )
}
