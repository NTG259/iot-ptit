import { useState } from 'react'
import { Alert, Button, Input, Select, Space, Tag } from 'antd'
import { LuSearch } from 'react-icons/lu'
import AppShell from '@/components/layout/AppShell'
import Badge from '@/components/common/Badge'
import DataTable from '@/components/common/DataTable'

import { lightToPercent } from '@/constants/sensors'
import { sensorService } from '@/services'
import useApi from '@/hooks/useApi'
import './Sensors.css'

const SENSOR_TYPES = {
  TEMPERATURE: { label: 'Temperature', tone: 'green', unitClass: 'sensors__value-unit--temperature', decimals: 1 },
  HUMIDITY: { label: 'Humidity', tone: 'cyan', unitClass: 'sensors__value-unit--humidity', decimals: 1 },
  LIGHT: { label: 'Light', tone: 'orange', unitClass: 'sensors__value-unit--light', decimals: 0 },
}

const SEARCH_FIELDS = [
  { value: 'TIME', label: 'Date time' },
  { value: 'TEMPERATURE', label: 'Temperature' },
  { value: 'HUMIDITY', label: 'Humidity' },
  { value: 'LIGHT', label: 'Light' },
]

function getSearchPlaceholder(searchField) {
  if (searchField === 'TEMPERATURE') return 'e.g. 28.5'
  if (searchField === 'HUMIDITY') return 'e.g. 65.0'
  if (searchField === 'LIGHT') return 'e.g. 300'
  return '2026-10-20, 2026-10, 17:30'
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
      const displayValue = row.sensorType === 'LIGHT' ? lightToPercent(value) : value
      const displayUnit = row.sensorType === 'LIGHT' ? '%' : row.unit
      return (
        <span className="sensors__value">
          <span className="sensors__value-number">{displayValue.toFixed(typeConfig.decimals)}</span>
          <span className={`sensors__value-unit ${typeConfig.unitClass}`}>{displayUnit}</span>
        </span>
      )
    },
  },
  {
    title: 'Timestamp',
    dataIndex: 'measuredAt',
    render: (measuredAt) => <span className="data-table__timestamp">{measuredAt}</span>,
  },
]

const EMPTY_PAGE = { items: [], totalItems: 0 }

/**
 * Sensors: trang bảng dữ liệu đo của các cảm biến.
 * - Mỗi lần search tạo một chip filter riêng (TIME hoặc một sensor type).
 * - Nhiều chip cùng tồn tại: kết quả là AND của tất cả filter đang active.
 * - Đổi searchField chỉ xoá inputText (draft), không xoá chip đã commit.
 * - Poll mỗi 2s.
 */
export default function Sensors() {
  // ─── STATE ───────────────────────────────────────────────────────────────────
  // inputText: nội dung đang nhập (chưa commit). Xóa sau mỗi lần Search.
  const [inputText, setInputText] = useState('')
  // searchField: trường đang được nhập hiện tại — TIME | TEMPERATURE | HUMIDITY | LIGHT.
  const [searchField, setSearchField] = useState('TIME')
  // timeFilter: chip TIME đang active — chuỗi datetime đã commit, null nếu chưa có.
  const [timeFilter, setTimeFilter] = useState(null)
  // sensorFilter: chip sensor đang active — { type, value } hoặc null. Chỉ một lúc.
  // Tìm kiếm sensor mới sẽ thay thế chip cũ (không tích lũy vì SQL chỉ filter 1 value).
  const [sensorFilter, setSensorFilter] = useState(null)
  const [newestFirst, setNewestFirst] = useState(true)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  // ─────────────────────────────────────────────────────────────────────────────

  const readingsRequest = useApi(
    () => sensorService.getReadings({
      timeSearch: timeFilter,
      valueSearch: sensorFilter?.value ?? null,
      types: sensorFilter ? [sensorFilter.type] : null,
      newestFirst,
      page,
      size: rowsPerPage,
    }),
    [timeFilter, sensorFilter, newestFirst, page, rowsPerPage],
    { intervalMs: 2000, initialData: EMPTY_PAGE },
  )
  const { items: rows, totalItems: totalRows } = readingsRequest.data

  // ─── HANDLERS ────────────────────────────────────────────────────────────────
  // Đổi field → chỉ xoá inputText (draft), chip đã commit không bị ảnh hưởng.
  function handleSearchFieldChange(newField) {
    setSearchField(newField)
    setInputText('')
  }
  function handleInputChange(event) {
    const value = event.target.value
    setInputText(value)
    // Xoá luôn filter tương ứng khi xoá hết input (nút X của Input component).
    if (value === '') {
      if (searchField === 'TIME') { setTimeFilter(null); setPage(1) }
      else { setSensorFilter(null); setPage(1) }
    }
  }
  function handleSearchCommit() {
    const trimmed = inputText.trim()
    if (!trimmed) return
    if (searchField === 'TIME') {
      setTimeFilter(trimmed)
    } else {
      setSensorFilter({ type: searchField, value: trimmed })
    }
    setInputText('')
    setPage(1)
  }
  function handleRowsPerPageChange(newRowsPerPage) { setRowsPerPage(newRowsPerPage); setPage(1) }
  function handleNewestFirstChange(newValue) { setNewestFirst(newValue); setPage(1) }
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── CHIPS ───────────────────────────────────────────────────────────────────
  const chips = []
  if (timeFilter) {
    chips.push({
      key: 'time',
      label: `Date time: ${timeFilter}`,
      onClose: () => { setTimeFilter(null); setPage(1) },
    })
  }
  if (sensorFilter) {
    chips.push({
      key: 'sensor',
      label: `${SENSOR_TYPES[sensorFilter.type].label}: ${sensorFilter.value}`,
      onClose: () => { setSensorFilter(null); setPage(1) },
    })
  }
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppShell breadcrumb="Sensors" title="Sensor Data" subtitle="Sensor reading history, updated every 2 seconds.">

      <div className="panel toolbar">
        <Space.Compact>
          <Select value={searchField} options={SEARCH_FIELDS} onChange={handleSearchFieldChange} style={{ width: 120 }} />
          <Input
            allowClear
            placeholder={getSearchPlaceholder(searchField)}
            value={inputText}
            onChange={handleInputChange}
            onPressEnter={handleSearchCommit}
            style={{ width: 240 }}
          />
          <Button icon={<LuSearch />} onClick={handleSearchCommit} />
        </Space.Compact>

        <Button onClick={() => {
          setInputText(''); setSearchField('TIME')
          setTimeFilter(null); setSensorFilter(null)
          setNewestFirst(true); setPage(1); setRowsPerPage(10)
        }}>Refresh</Button>
      </div>

      {chips.length > 0 && (
        <div className="sensors__chips">
          {chips.map(chip => (
            <Tag key={chip.key} closable onClose={chip.onClose} className="sensors__chip">
              {chip.label}
            </Tag>
          ))}
        </div>
      )}

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
        onPageChange={setPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        newestFirst={newestFirst}
        onNewestFirstChange={handleNewestFirstChange}
      />
    </AppShell>
  )
}
