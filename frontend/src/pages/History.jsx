import { useState } from 'react'
import { Alert, DatePicker, Input, Select, Space } from 'antd'
import AppShell from '@/components/layout/AppShell'
import CheckboxFilter from '@/components/common/CheckboxFilter'
import Badge from '@/components/common/Badge'
import DataTable from '@/components/common/DataTable'
import { dinhDangNgayGio, khoangNgay } from '@/utils/format'
import { dichVuLichSu } from '@/services'
import useGoiApi from '@/hooks/useApi'

// Nhãn và màu hiển thị trong bảng.
const TRANG_THAI = {
  SUCCESS: { label: 'Success', tone: 'green' },
  PENDING: { label: 'Pending', tone: 'blue' },
  FAILED: { label: 'Failed', tone: 'red' },
}
const HANH_DONG = { TURN_ON: 'Turn ON', TURN_OFF: 'Turn OFF' }
const LOAI_THIET_BI = { SMART_LED: 'Smart LED' }

// Các ô tick của ba bộ lọc.
const LUA_CHON_TRANG_THAI = [
  { value: 'SUCCESS', label: 'Success' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
]
const LUA_CHON_HANH_DONG = [
  { value: 'TURN_ON', label: 'Turn ON' },
  { value: 'TURN_OFF', label: 'Turn OFF' },
]
const LUA_CHON_LOAI_THIET_BI = [{ value: 'SMART_LED', label: 'Smart LED' }]

// Các trường mà ô tìm kiếm có thể so khớp, kèm gợi ý nhập.
const TRUONG_TIM_KIEM = [
  { value: 'NAME', label: 'Name', placeholder: 'Device name' },
  { value: 'TYPE', label: 'Type', placeholder: 'Smart LED' },
  { value: 'TIME', label: 'Date time', placeholder: '2026-10-03 17:20 or 17:20:05' },
]

// Trang kết quả rỗng, dùng khi chưa tải xong hoặc khi bỏ tick hết một bộ lọc.
const TRANG_TRONG = { items: [], totalItems: 0 }

const CAC_COT = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Device', dataIndex: 'deviceName', render: (ten) => <span className="text-base font-semibold">{ten}</span> },
  {
    title: 'Device Type',
    dataIndex: 'deviceType',
    render: (loai) => (
      <span className="px-3 py-1.5 rounded-md border border-outline bg-slate-50">{LOAI_THIET_BI[loai] ?? loai}</span>
    ),
  },
  { title: 'Action', dataIndex: 'action', render: (hanhDong) => <span className="text-base">{HANH_DONG[hanhDong]}</span> },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (trangThai) => (
      <Badge tone={TRANG_THAI[trangThai].tone} dot>
        {TRANG_THAI[trangThai].label}
      </Badge>
    ),
  },
  {
    title: 'Timestamp',
    dataIndex: 'createdAt',
    render: (luc) => <span className="text-sm text-slate-600 whitespace-nowrap">{dinhDangNgayGio(new Date(luc))}</span>,
  },
]

/**
 * History: trang lịch sử bật/tắt thiết bị (action history).
 * - Thanh công cụ: tìm theo tên, loại thiết bị hoặc ngày giờ (chọn trường ở ô dropdown bên cạnh), lọc theo Status / Action / Device Type và theo ngày.
 *   Mọi thay đổi bộ lọc đều quay về trang 1.
 * - Bỏ tick hết một bộ lọc nghĩa là "không hiện gì"; còn tick đủ tất cả thì không gửi bộ lọc đó (API hiểu là "mọi giá trị").
 * - Poll mỗi 3s để thấy các lệnh PENDING chuyển sang SUCCESS / FAILED.
 */
export default function History() {
  const [tuKhoa, datTuKhoa] = useState('')
  const [truongTim, datTruongTim] = useState('NAME')
  const [cacTrangThai, datCacTrangThai] = useState(['SUCCESS', 'PENDING', 'FAILED'])
  const [cacHanhDong, datCacHanhDong] = useState(['TURN_ON', 'TURN_OFF'])
  const [cacLoaiThietBi, datCacLoaiThietBi] = useState(['SMART_LED'])
  const [ngay, datNgay] = useState(null)
  const [moiNhatTruoc, datMoiNhatTruoc] = useState(true)
  const [trang, datTrang] = useState(1)
  const [soDongMoiTrang, datSoDongMoiTrang] = useState(10)

  // Tải bảng lịch sử, tự tải lại mỗi 3s. Bỏ tick hết một bộ lọc thì không hiện gì; tick đủ tất cả thì không gửi bộ lọc đó.
  const bangLichSu = useGoiApi(
    () => {
      if (cacTrangThai.length === 0 || cacHanhDong.length === 0 || cacLoaiThietBi.length === 0) return Promise.resolve(TRANG_TRONG)
      return dichVuLichSu.layLichSuLenh({
        search: tuKhoa.trim(),
        searchBy: truongTim,
        status: cacTrangThai.length === 3 ? null : cacTrangThai,
        action: cacHanhDong.length === 2 ? null : cacHanhDong,
        deviceType: cacLoaiThietBi.length === 1 ? null : cacLoaiThietBi,
        ...khoangNgay(ngay),
        newestFirst: moiNhatTruoc,
        page: trang,
        size: soDongMoiTrang,
      })
    },
    [tuKhoa, truongTim, cacTrangThai, cacHanhDong, cacLoaiThietBi, ngay, moiNhatTruoc, trang, soDongMoiTrang],
    { chuKyMs: 3000, giaTriDau: TRANG_TRONG },
  )
  const { items: cacDong, totalItems: tongSo } = bangLichSu.duLieu

  return (
    <AppShell
      breadcrumb="History"
      title="Action History"
      subtitle="Real-time audit telemetry and automated action dispatch log across mesh nodes."
    >
      <div className="panel shrink-0 p-3 flex flex-wrap items-center gap-3">
        {/* Đổi bộ lọc nào cũng quay về trang 1. */}
        <Space.Compact>
          <Select
            value={truongTim}
            options={TRUONG_TIM_KIEM}
            onChange={(giaTri) => {
              datTruongTim(giaTri)
              datTuKhoa('')
              datTrang(1)
            }}
            style={{ width: 120 }}
          />
          <Input
            allowClear
            placeholder={TRUONG_TIM_KIEM.find((t) => t.value === truongTim).placeholder}
            value={tuKhoa}
            onChange={(e) => {
              datTuKhoa(e.target.value)
              datTrang(1)
            }}
            style={{ width: 240 }}
          />
        </Space.Compact>
        <CheckboxFilter
          label="Status"
          options={LUA_CHON_TRANG_THAI}
          value={cacTrangThai}
          onChange={(giaTri) => {
            datCacTrangThai(giaTri)
            datTrang(1)
          }}
        />
        <CheckboxFilter
          label="Action"
          options={LUA_CHON_HANH_DONG}
          value={cacHanhDong}
          onChange={(giaTri) => {
            datCacHanhDong(giaTri)
            datTrang(1)
          }}
        />
        <CheckboxFilter
          label="Device Type"
          options={LUA_CHON_LOAI_THIET_BI}
          value={cacLoaiThietBi}
          onChange={(giaTri) => {
            datCacLoaiThietBi(giaTri)
            datTrang(1)
          }}
        />
        <DatePicker
          value={ngay}
          onChange={(giaTri) => {
            datNgay(giaTri)
            datTrang(1)
          }}
        />
      </div>

      {bangLichSu.loi && <Alert type="error" showIcon title={`Could not load history: ${bangLichSu.loi.message}`} />}

      <DataTable
        columns={CAC_COT}
        sortColumn="createdAt"
        rows={cacDong}
        loaded={!bangLichSu.dangTai}
        emptyText="No actions match these filters."
        page={trang}
        rowsPerPage={soDongMoiTrang}
        total={tongSo}
        onPageChange={datTrang}
        onRowsPerPageChange={(giaTri) => {
          datSoDongMoiTrang(giaTri)
          datTrang(1)
        }}
        newestFirst={moiNhatTruoc}
        onNewestFirstChange={(giaTri) => {
          datMoiNhatTruoc(giaTri)
          datTrang(1)
        }}
      />
    </AppShell>
  )
}
