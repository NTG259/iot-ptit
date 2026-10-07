import { useState } from 'react'
import { Alert, Button, Tabs, notification } from 'antd'
import AppShell from '@/components/layout/AppShell'
import MetricCard from '@/components/common/MetricCard'
import TelemetryChart from '@/components/common/TelemetryChart'
import LedDeviceCard from '@/components/common/LedDeviceCard'
import GreetingHeader from '@/components/common/GreetingHeader'
import { dichVuThietBi, dichVuCamBien, phien } from '@/services'
import useGoiApi from '@/hooks/useApi'
import { NHIET_DO, DO_AM, ANH_SANG, CAM_BIEN_TRONG, dinhDangSoDo } from '@/constants/sensors'

function PanelTitle({ children }) {
  return <h2 className="m-0 text-lg font-semibold text-text">{children}</h2>
}

// Một đường của biểu đồ; `bieuDo` là { values, times } từ backend.
function duongBieuDo(cauHinh, bieuDo) {
  return {
    id: cauHinh.id,
    color: cauHinh.color,
    label: cauHinh.short,
    values: bieuDo.values,
    format: (giaTri) => dinhDangSoDo(giaTri, cauHinh),
  }
}

// Nhãn một tab biểu đồ: chấm màu và tên cảm biến kèm đơn vị.
function NhanTab({ cauHinh }) {
  return (
    <span className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cauHinh.color }} />
      {cauHinh.unit ? `${cauHinh.label} (${cauHinh.unit})` : cauHinh.label}
    </span>
  )
}

// Lệnh gửi lên backend và trạng thái LED mong đợi sau khi ESP8266 xác nhận.
function lenhCho(bat) {
  if (bat) return { hanhDong: 'TURN_ON', trangThai: 'ON' }
  return { hanhDong: 'TURN_OFF', trangThai: 'OFF' }
}

// Biểu đồ khi chưa tải xong.
const BIEU_DO_TRONG = { values: [], times: [] }

/**
 * Dashboard: trang tổng quan thời gian thực — 3 thẻ chỉ số, biểu đồ 25 số đo gần nhất của từng cảm biến (chọn bằng
 * thanh tab, mỗi lúc một biểu đồ) và bảng điều khiển LED.
 * Lệnh LED đang chờ được tính ở backend.
 */
export default function Dashboard() {
  const [thongBao, khungThongBao] = notification.useNotification()
  // Công tắc LED người dùng vừa bấm, hiện ngay trạng thái mong muốn mà không chờ ESP8266: { LED1: true }.
  const [mongMuon, datMongMuon] = useState({})
  // Biểu đồ đang xem: id của một cảm biến trong NHIET_DO / DO_AM / ANH_SANG.
  const [bieuDoDangXem, datBieuDoDangXem] = useState(NHIET_DO.id)

  // Tải dữ liệu từ DB và tự tải lại: với mỗi cảm biến, thông tin hiện tại (giá trị mới nhất, trạng thái kết nối) và
  // 25 số đo mới nhất cho biểu đồ (values, times), mỗi 2s; LED mỗi 1s. `giaTriDau` là dữ liệu khi chưa tải xong.
  const thongTinNhietDo = useGoiApi(() => dichVuCamBien.layNhietDo(), [], { chuKyMs: 2000, giaTriDau: CAM_BIEN_TRONG })
  const thongTinDoAm = useGoiApi(() => dichVuCamBien.layDoAm(), [], { chuKyMs: 2000, giaTriDau: CAM_BIEN_TRONG })
  const thongTinAnhSang = useGoiApi(() => dichVuCamBien.layAnhSang(), [], { chuKyMs: 2000, giaTriDau: CAM_BIEN_TRONG })
  const bieuDoNhietDo = useGoiApi(() => dichVuCamBien.layNhietDoMoiNhat({ limit: 25 }), [], { chuKyMs: 2000, giaTriDau: BIEU_DO_TRONG })
  const bieuDoDoAm = useGoiApi(() => dichVuCamBien.layDoAmMoiNhat({ limit: 25 }), [], { chuKyMs: 2000, giaTriDau: BIEU_DO_TRONG })
  const bieuDoAnhSang = useGoiApi(() => dichVuCamBien.layAnhSangMoiNhat({ limit: 25 }), [], { chuKyMs: 2000, giaTriDau: BIEU_DO_TRONG })
  const thietBi = useGoiApi(() => dichVuThietBi.layDanhSachDen(), [], { chuKyMs: 1000, giaTriDau: [] })

  const nhietDo = thongTinNhietDo.duLieu
  const doAm = thongTinDoAm.duLieu
  const anhSang = thongTinAnhSang.duLieu
  const cacDen = thietBi.duLieu

  // Ba biểu đồ, mỗi cảm biến một cái; chỉ biểu đồ của tab đang chọn được vẽ.
  const cacBieuDo = [
    { cauHinh: NHIET_DO, camBien: nhietDo, bieuDo: bieuDoNhietDo },
    { cauHinh: DO_AM, camBien: doAm, bieuDo: bieuDoDoAm },
    { cauHinh: ANH_SANG, camBien: anhSang, bieuDo: bieuDoAnhSang },
  ]
  const dangXem = cacBieuDo.find((muc) => muc.cauHinh.id === bieuDoDangXem)
  const { values, times: cacGio } = dangXem.bieuDo.duLieu

  // Hỏi backend mỗi 0,3 giây cho tới khi không còn LED nào chờ ESP8266 xác nhận (`pendingAction` hết).
  // Quá hạn thì backend tự đánh dấu FAILED sau 10s, nên tối đa chờ 12 giây. Trả về danh sách LED mới nhất.
  async function doiDen() {
    let danhSach = []
    for (let lan = 0; lan < 40; lan++) {
      danhSach = await dichVuThietBi.layDanhSachDen()
      if (!danhSach.some((den) => den.pendingAction)) break
      await new Promise((xong) => setTimeout(xong, 300))
    }
    return danhSach
  }

  // Bật/tắt một LED: công tắc đổi ngay (`mongMuon`), gửi lệnh, rồi chờ ESP8266 xác nhận. Bị từ chối (ESP8266 offline,
  // broker lỗi…) hoặc LED không đổi trạng thái thì báo lỗi; cuối cùng bỏ `mongMuon` nên công tắc theo trạng thái thật
  // (thất bại thì tự về lại như cũ).
  async function batTatDen(ma, bat) {
    const { hanhDong, trangThai } = lenhCho(bat)

    datMongMuon((truoc) => ({ ...truoc, [ma]: bat }))
    try {
      await dichVuThietBi.dieuKhien(ma, hanhDong)
      const danhSach = await doiDen()
      if (danhSach.find((den) => den.code === ma).state !== trangThai) {
        thongBao.error({ title: 'No response', description: `${ma} did not respond` })
      }
    } catch (loiGoi) {
      thongBao.error({ title: 'Command failed', description: loiGoi.message })
    }
    datMongMuon((truoc) => ({ ...truoc, [ma]: undefined }))
    thietBi.taiLai()
  }

  // Bật/tắt cả 3 LED, cùng cách làm như `batTatDen`.
  async function batTatCaDen(bat) {
    const { hanhDong, trangThai } = lenhCho(bat)

    datMongMuon({ LED1: bat, LED2: bat, LED3: bat })
    try {
      await dichVuThietBi.dieuKhienTatCa(hanhDong)
      const danhSach = await doiDen()
      if (danhSach.some((den) => den.state !== trangThai)) {
        thongBao.error({ title: 'No response', description: 'Some LEDs did not respond' })
      }
    } catch (loiGoi) {
      thongBao.error({ title: 'Command failed', description: loiGoi.message })
    }
    datMongMuon({})
    thietBi.taiLai()
  }

  return (
    <AppShell>
      {khungThongBao}
      <GreetingHeader name={phien.layNguoiDung()?.fullName} />

      {thongTinNhietDo.loi && <Alert type="error" showIcon title={`Could not load sensor readings: ${thongTinNhietDo.loi.message}`} />}

      {/* 3 thẻ chỉ số: nhiệt độ, độ ẩm, ánh sáng. */}
      <div className="shrink-0 grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        <MetricCard config={NHIET_DO} sensor={nhietDo} />
        <MetricCard config={DO_AM} sensor={doAm} />
        <MetricCard config={ANH_SANG} sensor={anhSang} />
      </div>

      {/* Biểu đồ: thanh tab chọn cảm biến, giá trị hiện tại của cảm biến đó rồi đến đồ thị. */}
      <section className="panel flex-1 min-h-[12rem] px-4 py-3 flex flex-col gap-2">
        <PanelTitle>Telemetry Spectrum</PanelTitle>

        <div className="flex items-center gap-4">
          <Tabs
            activeKey={bieuDoDangXem}
            onChange={datBieuDoDangXem}
            tabBarStyle={{ margin: 0 }}
            items={cacBieuDo.map(({ cauHinh }) => ({ key: cauHinh.id, label: <NhanTab cauHinh={cauHinh} /> }))}
          />
          <span className="ml-auto tabular-nums text-sm text-muted">
            {!dangXem.bieuDo.dangTai && values.length < 2 ? 'Not enough readings yet.' : `Now: ${dinhDangSoDo(dangXem.camBien.lastValue, dangXem.cauHinh)}`}
          </span>
        </div>

        {/* Chỉ vẽ khi có ít nhất 2 điểm. Trục X hiện 7 mốc: giờ của các điểm 1, 5, 9, 13, 17, 21 và 25 (trong 25 điểm).
            `key` đổi theo tab để vạch dọc và tooltip của biểu đồ trước không còn khi chuyển tab. */}
        <TelemetryChart
          key={dangXem.cauHinh.id}
          series={values.length > 1 ? [duongBieuDo(dangXem.cauHinh, dangXem.bieuDo.duLieu)] : []}
          labels={[cacGio[0], cacGio[4], cacGio[8], cacGio[12], cacGio[16], cacGio[20], cacGio[24]]}
          pointLabels={cacGio}
          yTicks={dangXem.cauHinh.yTicks}
          unit={dangXem.cauHinh.unit}
        />
      </section>

      {/* Điều khiển LED. Công tắc hiện trạng thái người dùng vừa chọn (`mongMuon`) ngay lập tức; nếu không có thì
          hiện `den.on` do backend tính (đích của lệnh đang chờ, không thì trạng thái thật). */}
      <section className="panel shrink-0 px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <PanelTitle>Led Devices</PanelTitle>
          <div className="flex gap-2">
            <Button onClick={() => batTatCaDen(true)} disabled={cacDen.length === 0}>
              All On
            </Button>
            <Button onClick={() => batTatCaDen(false)} disabled={cacDen.length === 0}>
              All Off
            </Button>
          </div>
        </div>

        {thietBi.loi && <Alert type="error" showIcon title={thietBi.loi.message} />}

        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
          {cacDen.map((den) => (
            <LedDeviceCard
              key={den.code}
              name={den.name}
              on={mongMuon[den.code] ?? den.on}
              onToggle={(bat) => batTatDen(den.code, bat)}
            />
          ))}
        </div>
      </section>
    </AppShell>
  )
}
