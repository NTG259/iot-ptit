import { useState } from 'react'
import { Alert, Button, DatePicker, Input, Select, Space } from 'antd'
import AppShell from '@/components/layout/AppShell'
import CheckboxFilter from '@/components/common/CheckboxFilter'
import Badge from '@/components/common/Badge'
import DataTable from '@/components/common/DataTable'
import { dinhDangNgayGio, khoangNgay } from '@/utils/format'
import { dichVuCamBien } from '@/services'
import useGoiApi from '@/hooks/useApi'

// Nhãn, màu và số chữ số thập phân của từng loại cảm biến (đơn vị lấy từ API).
const LOAI = {
  TEMPERATURE: { label: 'Temperature', tone: 'green', unitClass: 'text-primary', decimals: 1 },
  HUMIDITY: { label: 'Humidity', tone: 'cyan', unitClass: 'text-cyan-600', decimals: 1 },
  LIGHT: { label: 'Light', tone: 'orange', unitClass: 'text-muted', decimals: 0 },
}

// Các ô tick của bộ lọc loại cảm biến.
const LUA_CHON_LOAI = [
  { value: 'TEMPERATURE', label: 'Temperature' },
  { value: 'LIGHT', label: 'Light' },
  { value: 'HUMIDITY', label: 'Humidity' },
]

// Các trường mà ô tìm kiếm có thể so khớp, kèm gợi ý nhập.
const TRUONG_TIM_KIEM = [
  { value: 'NAME', label: 'Name', placeholder: 'Sensor name' },
  { value: 'TYPE', label: 'Type', placeholder: 'Temperature, Humidity, Light' },
  { value: 'VALUE', label: 'Value', placeholder: 'Exact value, e.g. 28.5' },
  { value: 'TIME', label: 'Date time', placeholder: '2026-10-03 17:20 or 17:20:05' },
]

const CAC_COT = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Sensor', dataIndex: 'sensorName', render: (ten) => <span className="font-medium whitespace-nowrap">{ten}</span> },
  { title: 'Sensor Type', dataIndex: 'sensorType', render: (loai) => <Badge tone={LOAI[loai].tone}>{LOAI[loai].label}</Badge> },
  {
    title: 'Value',
    dataIndex: 'value',
    render: (giaTri, dong) => {
      const cauHinhLoai = LOAI[dong.sensorType]
      return (
        <span className="whitespace-nowrap">
          <span className="text-lg font-semibold">{giaTri.toFixed(cauHinhLoai.decimals)}</span>
          <span className={`ml-1 text-sm ${cauHinhLoai.unitClass}`}>{dong.unit}</span>
        </span>
      )
    },
  },
  {
    title: 'Timestamp',
    dataIndex: 'measuredAt',
    render: (luc) => <span className="text-sm text-slate-600 whitespace-nowrap">{dinhDangNgayGio(new Date(luc))}</span>,
  },
]

// Trang kết quả rỗng, dùng khi chưa tải xong hoặc khi bỏ tick hết loại cảm biến.
const TRANG_TRONG = { items: [], totalItems: 0 }

/**
 * Sensors: trang bảng dữ liệu đo của các cảm biến.
 * - Thanh công cụ: tìm theo tên, loại, giá trị hoặc ngày giờ (chọn trường ở ô dropdown bên cạnh), lọc theo loại cảm biến, chọn một ngày
 *   (giờ Việt Nam, ô tìm kiếm có thể thu hẹp tiếp tới 17:20 hay 17:20:05) và nút Refresh.
 *   Mọi thay đổi bộ lọc đều quay về trang 1.
 * - Bỏ tick hết loại cảm biến nghĩa là "không hiện gì"; tick đủ tất cả thì không gửi bộ lọc loại.
 * - Poll mỗi 2s, đúng nhịp ESP8266 gửi dữ liệu.
 */
export default function Sensors() {
  const [tuKhoa, datTuKhoa] = useState('')
  const [truongTim, datTruongTim] = useState('NAME')
  const [cacLoai, datCacLoai] = useState(['TEMPERATURE', 'LIGHT', 'HUMIDITY'])
  const [ngay, datNgay] = useState(null)
  const [moiNhatTruoc, datMoiNhatTruoc] = useState(true)
  const [trang, datTrang] = useState(1)
  const [soDongMoiTrang, datSoDongMoiTrang] = useState(10)

  // Tải bảng số đo, tự tải lại mỗi 2s. Bỏ tick hết loại thì không hiện gì; tick đủ 3 loại thì không gửi bộ lọc loại.
  const bangSoDo = useGoiApi(
    () => {
      if (cacLoai.length === 0) return Promise.resolve(TRANG_TRONG)
      return dichVuCamBien.laySoDo({
        search: tuKhoa.trim(),
        searchBy: truongTim,
        types: cacLoai.length === 3 ? null : cacLoai,
        ...khoangNgay(ngay),
        newestFirst: moiNhatTruoc,
        page: trang,
        size: soDongMoiTrang,
      })
    },
    [tuKhoa, truongTim, cacLoai, ngay, moiNhatTruoc, trang, soDongMoiTrang],
    { chuKyMs: 2000, giaTriDau: TRANG_TRONG },
  )
  const { items: cacDong, totalItems: tongSo } = bangSoDo.duLieu

  return (
    <AppShell breadcrumb="Sensors" title="Sensor Data" subtitle="Sensor reading history, updated every 2 seconds.">
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
            style={{ width: 260 }}
          />
        </Space.Compact>
        <CheckboxFilter
          label="Sensor Type"
          options={LUA_CHON_LOAI}
          value={cacLoai}
          onChange={(giaTri) => {
            datCacLoai(giaTri)
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
        <Button onClick={bangSoDo.taiLai}>Refresh</Button>
      </div>

      {bangSoDo.loi && <Alert type="error" showIcon title={`Could not load sensor data: ${bangSoDo.loi.message}`} />}

      <DataTable
        columns={CAC_COT}
        sortColumn="measuredAt"
        rows={cacDong}
        loaded={!bangSoDo.dangTai}
        emptyText="No readings match these filters."
        page={trang}
        rowsPerPage={soDongMoiTrang}
        total={tongSo}
        noun="readings"
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
