import { useState } from 'react'
import { Alert, Input } from 'antd'
import { LuSearch } from 'react-icons/lu'
import AppShell from '@/components/layout/AppShell'
import CheckboxFilter from '@/components/common/CheckboxFilter'
import Badge from '@/components/common/Badge'
import DataTable from '@/components/common/DataTable'
import { formatDateTime } from '@/utils/format'
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
  // ─── STATE BỘ LỌC VÀ PHÂN TRANG ─────────────────────────────────────────────
  // inputText: nội dung hiện tại trong ô nhập — thay đổi từng ký tự nhưng chưa gửi backend.
  const [inputText, setInputText] = useState('')
  // searchText: từ khoá đã commit — chỉ đổi khi nhấn Enter hoặc xoá (nút X).
  const [searchText, setSearchText] = useState('')
  // searchField: trường backend dùng để so khớp searchText — 'NAME' | 'TYPE' | 'TIME'.
  //   · NAME → so với tên thiết bị (ví dụ "Living Room LED").
  //   · TYPE → so với loại thiết bị (ví dụ "Smart LED").
  //   · TIME → so với ngày giờ lệnh được tạo (ví dụ "2026-10-03 17:20" hoặc "17:20:05").
  //   Khi đổi trường, searchText bị xoá để tránh gửi từ khoá không hợp lệ với trường mới.
  // selectedStatuses: mảng trạng thái lệnh đang được tick — ['SUCCESS', 'PENDING', 'FAILED'].
  //   · SUCCESS: lệnh đã được ESP8266 xác nhận thực hiện thành công.
  //   · PENDING: lệnh đã gửi nhưng chưa có phản hồi từ ESP8266.
  //   · FAILED:  lệnh thất bại (ESP8266 báo lỗi hoặc timeout).
  //   Bỏ tick hết → không gọi API. Tick đủ cả ba → gửi status: null (không lọc).
  const [selectedStatuses, setSelectedStatuses] = useState(['SUCCESS', 'PENDING', 'FAILED'])
  // selectedActions: loại lệnh đang được tick — ['TURN_ON', 'TURN_OFF'].
  //   Bỏ tick hết → không gọi API. Tick đủ cả hai → gửi action: null (không lọc).
  const [selectedActions, setSelectedActions] = useState(['TURN_ON', 'TURN_OFF'])
  // selectedDeviceTypes: loại thiết bị đang được tick — ['SMART_LED'].
  //   Bỏ tick hết → không gọi API. Tick đủ → gửi deviceType: null (không lọc).
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState(['SMART_LED'])
  // selectedDate: ngày đang chọn (đối tượng dayjs), null = mọi ngày.
  // newestFirst: true = mới nhất trước (mặc định), false = cũ nhất trước.
  const [newestFirst, setNewestFirst] = useState(true)
  // page: trang hiện tại (bắt đầu từ 1). Mọi thay đổi bộ lọc đặt lại về 1.
  const [page, setPage] = useState(1)
  // rowsPerPage: số hàng mỗi trang (mặc định 10).
  const [rowsPerPage, setRowsPerPage] = useState(10)
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── GỌI API LẤY LỊCH SỬ LỆNH ───────────────────────────────────────────────
  // Poll mỗi 3s (chậm hơn Sensors vì lệnh PENDING → SUCCESS/FAILED không cần cập nhật tức thì).
  // Mỗi khi bất kỳ state bộ lọc nào đổi, useApi gọi lại ngay.
  //
  // Logic kiểm tra trước khi gọi API:
  //   1. Bất kỳ bộ lọc nào rỗng (bỏ tick hết) → trả EMPTY_PAGE ngay, không gọi API.
  //      (Ba bộ lọc kiểm tra: selectedStatuses, selectedActions, selectedDeviceTypes)
  //   2. Tick đủ tất cả giá trị của một bộ lọc → gửi null cho bộ lọc đó (không lọc).
  //   3. dayRange(selectedDate) → { from, to } ISO 8601 UTC+7, cả hai null nếu không chọn ngày.
  //
  // Tham số gửi lên: GET /action-histories
  //   - search: từ khoá tìm kiếm (đã trim).
  //   - searchBy: trường so khớp ('NAME' | 'TYPE' | 'TIME').
  //   - status: mảng trạng thái lọc, hoặc null nếu chọn hết.
  //   - action: mảng loại lệnh lọc, hoặc null nếu chọn hết.
  //   - deviceType: mảng loại thiết bị lọc, hoặc null nếu chọn hết.
  //   - from, to: khoảng thời gian (ISO 8601 UTC+7), hoặc null nếu không chọn ngày.
  //   - newestFirst, page, size: sắp xếp và phân trang.
  //
  // Dữ liệu nhận về: { items: ActionHistory[], totalItems: number }
  //   - items: mảng lệnh trong trang hiện tại.
  //     Mỗi phần tử: { id, deviceName, deviceType, action, status, createdAt }
  //       · action: 'TURN_ON' | 'TURN_OFF'.
  //       · status: 'SUCCESS' | 'PENDING' | 'FAILED'.
  //       · createdAt: ISO 8601 — render thành "YYYY-MM-DD HH:mm:ss" giờ Việt Nam.
  //   - totalItems: tổng số bản ghi khớp bộ lọc (dùng tính số trang).
  const historyRequest = useApi(
    () => {
      // Bỏ tick hết bất kỳ bộ lọc nào → không gọi API, không hiện gì
      const anyFilterEmpty = selectedStatuses.length === 0 || selectedActions.length === 0 || selectedDeviceTypes.length === 0
      if (anyFilterEmpty) {
        return Promise.resolve(EMPTY_PAGE)
      }
      // Tick đủ tất cả → gửi null, backend không lọc theo bộ lọc đó
      const allStatusesSelected = selectedStatuses.length === STATUS_OPTIONS.length
      const allActionsSelected = selectedActions.length === ACTION_OPTIONS.length
      const allDeviceTypesSelected = selectedDeviceTypes.length === DEVICE_TYPE_OPTIONS.length
      // Đổi ngày đã chọn thành khoảng [00:00:00 → 23:59:59.999] giờ Việt Nam
      return actionHistoryService.getActionHistory({
        search: searchText.trim(),
        searchBy: 'TIME',
        status: allStatusesSelected ? null : selectedStatuses,
        action: allActionsSelected ? null : selectedActions,
        deviceType: allDeviceTypesSelected ? null : selectedDeviceTypes,
        newestFirst,
        page,
        size: rowsPerPage,
      })
    },
    [searchText, selectedStatuses, selectedActions, selectedDeviceTypes, newestFirst, page, rowsPerPage],
    { intervalMs: 3000, initialData: EMPTY_PAGE },
  )
  // Destructure để DataTable dùng thẳng
  const { items: rows, totalItems: totalRows } = historyRequest.data
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── XỬ LÝ THAY ĐỔI BỘ LỌC ──────────────────────────────────────────────────
  // Mọi handler đều reset page về 1 để tránh đứng ở trang 5 nhưng kết quả chỉ có 1 trang.

  // Nhập từng ký tự → chỉ cập nhật ô hiển thị, chưa gửi backend.
  // Nếu xoá hết (nút X hoặc backspace) → commit luôn để xoá kết quả tìm kiếm.
  function handleInputChange(event) {
    const value = event.target.value
    setInputText(value)
    if (value === '') {
      setSearchText('')
      setPage(1)
    }
  }

  // Nhấn Enter → commit từ khoá hiện tại vào searchText, gửi lên backend.
  function handleSearchCommit() {
    setSearchText(inputText)
    setPage(1)
  }
  // Bật/tắt tick trạng thái lệnh — newStatuses là mảng các giá trị đang được tick.
  function handleStatusesChange(newStatuses) {
    setSelectedStatuses(newStatuses)
    setPage(1)
  }
  // Bật/tắt tick loại lệnh (TURN_ON / TURN_OFF).
  function handleActionsChange(newActions) {
    setSelectedActions(newActions)
    setPage(1)
  }
  // Bật/tắt tick loại thiết bị.
  function handleDeviceTypesChange(newDeviceTypes) {
    setSelectedDeviceTypes(newDeviceTypes)
    setPage(1)
  }
  // Chọn ngày trên DatePicker — newDate là đối tượng dayjs hoặc null khi xoá.
  // Đổi số hàng mỗi trang → về trang 1.
  function handleRowsPerPageChange(newRowsPerPage) {
    setRowsPerPage(newRowsPerPage)
    setPage(1)
  }
  // Đổi chiều sắp xếp.
  function handleNewestFirstChange(newValue) {
    setNewestFirst(newValue)
    setPage(1)
  }
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppShell
      breadcrumb="History"
      title="Action History"
      subtitle="Real-time audit telemetry and automated action dispatch log across mesh nodes."
    >
      {/* ── KHỐI: THANH CÔNG CỤ TÌM KIẾM VÀ LỌC ──────────────────────────────────── */}
      <div className="panel toolbar">
        {/* Ô tìm kiếm: dropdown chọn trường (trái) + ô nhập từ khoá (phải).
            - Select: chọn searchField — NAME | TYPE | TIME.
              Đổi trường → handleSearchFieldChange xoá searchText và về trang 1.
            - Input: nhập từ khoá — thay đổi ngay lập tức (không debounce).
              allowClear: hiện nút X để xoá nhanh.
              placeholder đổi theo searchField để gợi ý định dạng nhập đúng. */}
        <Input
          addonBefore="Date time"
          allowClear
          prefix={<LuSearch size="1rem" color="var(--color-muted)" />}
          placeholder="2026-10-20, *-12-30, 17:20, *:30"
          value={inputText}
          onChange={handleInputChange}
          onPressEnter={handleSearchCommit}
          style={{ width: 360 }}
        />

        {/* Bộ lọc trạng thái lệnh: SUCCESS | PENDING | FAILED.
            Bỏ tick hết → không gọi API. Tick đủ cả ba → không gửi bộ lọc status (trả mọi trạng thái).
            Poll 3s nên PENDING sẽ tự chuyển SUCCESS/FAILED mà không cần bấm Refresh. */}
        <CheckboxFilter label="Status" options={STATUS_OPTIONS} value={selectedStatuses} onChange={handleStatusesChange} />

        {/* Bộ lọc loại lệnh: TURN_ON | TURN_OFF.
            Bỏ tick hết → không gọi API. Tick đủ cả hai → không gửi bộ lọc action. */}
        <CheckboxFilter label="Action" options={ACTION_OPTIONS} value={selectedActions} onChange={handleActionsChange} />

        {/* Bộ lọc loại thiết bị: SMART_LED (hiện tại chỉ có một loại).
            Bỏ tick hết → không gọi API. Tick đủ → không gửi bộ lọc deviceType. */}
        <CheckboxFilter label="Device Type" options={DEVICE_TYPE_OPTIONS} value={selectedDeviceTypes} onChange={handleDeviceTypesChange} />

      </div>

      {/* Hiện banner lỗi nếu API trả lỗi (lỗi mạng, server, ...). */}
      {historyRequest.error && <Alert type="error" showIcon title={`Could not load history: ${historyRequest.error.message}`} />}

      {/* ── KHỐI: BẢNG LỊCH SỬ LỆNH ──────────────────────────────────────────────
          Hiển thị danh sách lệnh có phân trang và sắp xếp.
          columns: định nghĩa các cột (ID, Device, Type, Action, Status, Timestamp) — khai báo ở trên.
          sortColumn: cột mặc định để sắp xếp (createdAt — thời điểm tạo lệnh).
          rows: mảng lệnh trang hiện tại từ API.
          loaded: false khi đang tải lần đầu → DataTable hiện skeleton.
          total: tổng số bản ghi khớp bộ lọc → DataTable tính số trang. */}
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
