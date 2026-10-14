import { useState } from 'react'
import { Alert, Button, Input, Select, Space } from 'antd'
import { LuSearch } from 'react-icons/lu'
import AppShell from '@/components/layout/AppShell'
import Badge from '@/components/common/Badge'
import DataTable from '@/components/common/DataTable'
import { formatDateTime } from '@/utils/format'
import { sensorService } from '@/services'
import useApi from '@/hooks/useApi'
import './Sensors.css'

// Nhãn, màu và số chữ số thập phân của từng loại cảm biến (đơn vị lấy từ API).
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
  // ─── STATE BỘ LỌC VÀ PHÂN TRANG ─────────────────────────────────────────────
  // searchText: nội dung ô tìm kiếm — được trim() trước khi gửi lên backend.
  const [searchText, setSearchText] = useState('')
  // searchField: trường backend dùng để so khớp searchText — 'NAME' | 'TYPE' | 'VALUE' | 'TIME'.
  //   · NAME  → so với tên cảm biến (ví dụ "DHT11 Temp").
  //   · TYPE  → so với loại cảm biến (ví dụ "Temperature", "Humidity", "Light").
  //   · VALUE → so khớp chính xác giá trị đo (ví dụ "28.5").
  //   · TIME  → so với ngày giờ đo (ví dụ "2026-10-03 17:20" hoặc "17:20:05").
  //   Khi đổi trường, searchText bị xoá để tránh gửi từ khoá không hợp lệ với trường mới.
  const [searchField, setSearchField] = useState('TIME')
  // newestFirst: true = sắp xếp mới nhất trước (mặc định), false = cũ nhất trước.
  const [newestFirst, setNewestFirst] = useState(true)
  // page: trang hiện tại (bắt đầu từ 1). Mọi thay đổi bộ lọc đặt lại về 1.
  const [page, setPage] = useState(1)
  // rowsPerPage: số hàng mỗi trang — người dùng chọn trên DataTable (mặc định 10).
  const [rowsPerPage, setRowsPerPage] = useState(10)
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── GỌI API LẤY DỮ LIỆU BẢNG ───────────────────────────────────────────────
  // Poll mỗi 2s (đúng nhịp ESP8266 gửi số đo). Mỗi khi bất kỳ state bộ lọc nào đổi,
  // useApi tự gọi lại hàm này ngay (không chờ hết chu kỳ 2s).
  //
  // Logic lọc trước khi gọi API:
  //   1. selectedTypes rỗng → trả EMPTY_PAGE ngay, không gọi API (tránh request vô nghĩa).
  //   2. allTypesSelected → gửi types: null (backend hiểu là không lọc theo loại).
  //   3. dayRange(selectedDate) → { from, to } ISO 8601 UTC+7, cả hai null nếu chưa chọn ngày.
  //
  // Tham số gửi lên: GET /sensor-data
  //   - search: từ khoá tìm kiếm (đã trim).
  //   - searchBy: trường so khớp ('NAME' | 'TYPE' | 'VALUE' | 'TIME').
  //   - types: mảng loại lọc, hoặc null nếu chọn hết.
  //   - from, to: khoảng thời gian theo ngày đã chọn (ISO 8601), hoặc null nếu không chọn.
  //   - newestFirst: thứ tự sắp xếp.
  //   - page, size: phân trang.
  //
  // Dữ liệu nhận về: { items: SensorReading[], totalItems: number }
  //   - items: mảng số đo trong trang hiện tại.
  //     Mỗi phần tử: { id, sensorName, sensorType, value, unit, measuredAt }
  //       · sensorType: 'TEMPERATURE' | 'HUMIDITY' | 'LIGHT'.
  //       · value: số thực (hiển thị theo decimals của SENSOR_TYPES).
  //       · measuredAt: ISO 8601 — render thành "YYYY-MM-DD HH:mm:ss" giờ Việt Nam.
  //   - totalItems: tổng số hàng khớp bộ lọc (dùng để tính số trang trên DataTable).
  const readingsRequest = useApi(
    () => {
      // Nếu chọn cảm biến cụ thể: lọc theo loại đó và tìm theo giá trị
      const isSensorField = searchField === 'TEMPERATURE' || searchField === 'HUMIDITY' || searchField === 'LIGHT'
      return sensorService.getReadings({
        search: searchText.trim(),
        searchBy: isSensorField ? 'VALUE' : searchField,
        types: isSensorField ? [searchField] : null,
        newestFirst,
        page,
        size: rowsPerPage,
      })
    },
    [searchText, searchField, newestFirst, page, rowsPerPage],
    { intervalMs: 2000, initialData: EMPTY_PAGE },
  )
  // Destructure để DataTable dùng thẳng
  const { items: rows, totalItems: totalRows } = readingsRequest.data
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── XỬ LÝ THAY ĐỔI BỘ LỌC ──────────────────────────────────────────────────
  // Mọi handler đều reset page về 1 để tránh đứng ở trang 5 nhưng kết quả chỉ có 1 trang.

  // Đổi trường tìm kiếm → xoá luôn searchText vì định dạng nhập khác nhau giữa các trường.
  // Ví dụ: đang nhập "28.5" cho VALUE, chuyển sang TIME thì "28.5" không hợp lệ.
  function handleSearchFieldChange(newField) {
    setSearchField(newField)
    setSearchText('')
    setPage(1)
  }
  // Nhập từng ký tự vào ô search → gửi lên backend ngay (không debounce), poll 2s đủ nhanh.
  function handleSearchTextChange(event) {
    setSearchText(event.target.value)
    setPage(1)
  }
  // Đổi số hàng mỗi trang → về trang 1 để tránh trang hiện tại vượt quá số trang mới.
  function handleRowsPerPageChange(newRowsPerPage) {
    setRowsPerPage(newRowsPerPage)
    setPage(1)
  }
  // Đổi chiều sắp xếp (mới nhất trước / cũ nhất trước).
  function handleNewestFirstChange(newValue) {
    setNewestFirst(newValue)
    setPage(1)
  }
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppShell breadcrumb="Sensors" title="Sensor Data" subtitle="Sensor reading history, updated every 2 seconds.">

      {/* ── KHỐI: THANH CÔNG CỤ TÌM KIẾM VÀ LỌC ──────────────────────────────────── */}
      <div className="panel toolbar">
        {/* Ô tìm kiếm: dropdown chọn trường (trái) + ô nhập từ khoá (phải).
            Hai ô ghép thành một cụm liền nhau bằng Space.Compact.
            - Select: chọn searchField — NAME | TYPE | VALUE | TIME.
              Đổi trường → handleSearchFieldChange xoá searchText và về trang 1.
            - Input: nhập từ khoá — thay đổi ngay lập tức (không debounce).
              allowClear: hiện nút X để xoá nhanh.
              placeholder đổi theo searchField để gợi ý định dạng nhập đúng. */}
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

        <Button onClick={readingsRequest.reload}>Refresh</Button>
      </div>

      {/* Hiện banner lỗi nếu API trả lỗi (lỗi mạng, server, ...). */}
      {readingsRequest.error && <Alert type="error" showIcon title={`Could not load sensor data: ${readingsRequest.error.message}`} />}

      {/* ── KHỐI: BẢNG DỮ LIỆU ────────────────────────────────────────────────────
          Hiển thị danh sách số đo có phân trang và sắp xếp.
          columns: định nghĩa các cột (ID, Sensor, Type, Value, Timestamp) — khai báo ở trên.
          sortColumn: cột mặc định để sắp xếp (measuredAt — thời điểm đo).
          rows: mảng số đo trang hiện tại từ API.
          loaded: false khi đang tải lần đầu → DataTable hiện skeleton.
          total: tổng số hàng khớp bộ lọc → DataTable tính số trang.
          Các callback onPageChange / onRowsPerPageChange / onNewestFirstChange đều reset về trang 1. */}
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
