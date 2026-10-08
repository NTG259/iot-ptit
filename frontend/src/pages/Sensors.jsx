import { useState } from 'react'
import { Alert, Button, DatePicker, Input, Select, Space } from 'antd'
import { LuSearch } from 'react-icons/lu'
import AppShell from '@/components/layout/AppShell'
import CheckboxFilter from '@/components/common/CheckboxFilter'
import Badge from '@/components/common/Badge'
import DataTable from '@/components/common/DataTable'
import { formatDateTime, dayRange } from '@/utils/format'
import { sensorService } from '@/services'
import useApi from '@/hooks/useApi'
import './Sensors.css'

// Nhãn, màu và số chữ số thập phân của từng loại cảm biến (đơn vị lấy từ API).
const SENSOR_TYPES = {
  TEMPERATURE: { label: 'Temperature', tone: 'green', unitClass: 'sensors__value-unit--temperature', decimals: 1 },
  HUMIDITY: { label: 'Humidity', tone: 'cyan', unitClass: 'sensors__value-unit--humidity', decimals: 1 },
  LIGHT: { label: 'Light', tone: 'orange', unitClass: 'sensors__value-unit--light', decimals: 0 },
}

// Các ô tick của bộ lọc loại cảm biến.
const TYPE_OPTIONS = [
  { value: 'TEMPERATURE', label: 'Temperature' },
  { value: 'LIGHT', label: 'Light' },
  { value: 'HUMIDITY', label: 'Humidity' },
]

// Các trường mà ô tìm kiếm có thể so khớp.
const SEARCH_FIELDS = [
  { value: 'NAME', label: 'Name' },
  { value: 'TYPE', label: 'Type' },
  { value: 'VALUE', label: 'Value' },
  { value: 'TIME', label: 'Date time' },
]

// Gợi ý nhập trong ô tìm kiếm, theo trường đang chọn.
function getSearchPlaceholder(searchField) {
  if (searchField === 'NAME') {
    return 'Sensor name'
  }
  if (searchField === 'TYPE') {
    return 'Temperature, Humidity, Light'
  }
  if (searchField === 'VALUE') {
    return 'Exact value, e.g. 28.5'
  }
  return '2026-10-03 17:20 or 17:20:05'
}

const COLUMNS = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Sensor', dataIndex: 'sensorName', render: (name) => <span className="sensors__name">{name}</span> },
  {
    title: 'Sensor Type',
    dataIndex: 'sensorType',
    render: (type) => <Badge tone={SENSOR_TYPES[type].tone}>{SENSOR_TYPES[type].label}</Badge>,
  },
  {
    title: 'Value',
    dataIndex: 'value',
    render: (value, row) => {
      const typeConfig = SENSOR_TYPES[row.sensorType]
      return (
        <span className="sensors__value">
          <span className="sensors__value-number">{value.toFixed(typeConfig.decimals)}</span>
          <span className={`sensors__value-unit ${typeConfig.unitClass}`}>{row.unit}</span>
        </span>
      )
    },
  },
  {
    title: 'Timestamp',
    dataIndex: 'measuredAt',
    render: (measuredAt) => <span className="data-table__timestamp">{formatDateTime(new Date(measuredAt))}</span>,
  },
]

// Trang kết quả rỗng, dùng khi chưa tải xong hoặc khi bỏ tick hết loại cảm biến.
const EMPTY_PAGE = { items: [], totalItems: 0 }

/**
 * Sensors: trang bảng dữ liệu đo của các cảm biến.
 * - Thanh công cụ: tìm theo tên, loại, giá trị hoặc ngày giờ (chọn trường ở ô dropdown bên cạnh), lọc theo loại cảm biến,
 *   chọn một ngày (giờ Việt Nam, ô tìm kiếm có thể thu hẹp tiếp tới 17:20 hay 17:20:05) và nút Refresh.
 *   Mọi thay đổi bộ lọc đều quay về trang 1.
 * - Bỏ tick hết loại cảm biến nghĩa là "không hiện gì"; tick đủ tất cả thì không gửi bộ lọc loại.
 * - Poll mỗi 2s, đúng nhịp ESP8266 gửi dữ liệu.
 */
export default function Sensors() {
  const [searchText, setSearchText] = useState('')
  const [searchField, setSearchField] = useState('NAME')
  const [selectedTypes, setSelectedTypes] = useState(['TEMPERATURE', 'LIGHT', 'HUMIDITY'])
  const [selectedDate, setSelectedDate] = useState(null)
  const [newestFirst, setNewestFirst] = useState(true)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Tải bảng số đo, tự tải lại mỗi 2s. Bỏ tick hết loại thì không hiện gì; tick đủ mọi loại thì không gửi bộ lọc loại.
  const readingsRequest = useApi(
    () => {
      if (selectedTypes.length === 0) {
        return Promise.resolve(EMPTY_PAGE)
      }
      const allTypesSelected = selectedTypes.length === TYPE_OPTIONS.length
      const { from, to } = dayRange(selectedDate)
      return sensorService.getReadings({
        search: searchText.trim(),
        searchBy: searchField,
        types: allTypesSelected ? null : selectedTypes,
        from,
        to,
        newestFirst,
        page,
        size: rowsPerPage,
      })
    },
    [searchText, searchField, selectedTypes, selectedDate, newestFirst, page, rowsPerPage],
    { intervalMs: 2000, initialData: EMPTY_PAGE },
  )
  const { items: rows, totalItems: totalRows } = readingsRequest.data

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
  function handleTypesChange(newTypes) {
    setSelectedTypes(newTypes)
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
    <AppShell breadcrumb="Sensors" title="Sensor Data" subtitle="Sensor reading history, updated every 2 seconds.">
      <div className="panel toolbar">
        <Space.Compact>
          <Select value={searchField} options={SEARCH_FIELDS} onChange={handleSearchFieldChange} style={{ width: 120 }} />
          <Input
            allowClear
            prefix={<LuSearch size="1rem" color="var(--color-muted)" />}
            placeholder={getSearchPlaceholder(searchField)}
            value={searchText}
            onChange={handleSearchTextChange}
            style={{ width: 260 }}
          />
        </Space.Compact>
        <CheckboxFilter label="Sensor Type" options={TYPE_OPTIONS} value={selectedTypes} onChange={handleTypesChange} />
        <DatePicker value={selectedDate} onChange={handleDateChange} />
        <Button onClick={readingsRequest.reload}>Refresh</Button>
      </div>

      {readingsRequest.error && <Alert type="error" showIcon title={`Could not load sensor data: ${readingsRequest.error.message}`} />}

      <DataTable
        columns={COLUMNS}
        sortColumn="measuredAt"
        rows={rows}
        loaded={!readingsRequest.loading}
        emptyText="No readings match these filters."
        page={page}
        rowsPerPage={rowsPerPage}
        total={totalRows}
        noun="readings"
        onPageChange={setPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        newestFirst={newestFirst}
        onNewestFirstChange={handleNewestFirstChange}
      />
    </AppShell>
  )
}
