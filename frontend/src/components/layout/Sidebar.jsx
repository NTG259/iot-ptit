import { NavLink, useNavigate } from 'react-router-dom'
import { Avatar, Dropdown } from 'antd'
import { LuChevronsUpDown, LuLayoutDashboard, LuLogOut, LuNetwork, LuScrollText, LuUser } from 'react-icons/lu'
import { DUONG_DAN } from '@/routes/paths'
import { dichVuXacThuc, phien } from '@/services'
import { layChuCaiDau } from '@/utils/user'

// Một mục điều hướng: icon, chữ và (nếu có) số đếm ở bên phải. Mục đang mở có nền xanh nhạt.
// `end` để mục Dashboard ("/") không sáng ở mọi trang.
function NavItem({ to, icon: Icon, end, badge, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-4 px-4 py-2.5 border rounded-lg text-[0.9375rem] no-underline transition-colors ${
          isActive
            ? 'bg-primary-soft border-primary-line text-primary font-semibold'
            : 'border-transparent text-text/80 hover:bg-canvas'
        }`
      }
    >
      <Icon className="w-5 h-5 shrink-0" />
      {children}
      {badge && <span className="ml-auto px-2 py-0.5 rounded-full bg-slate-100 tabular-nums text-xs font-normal text-muted">{badge}</span>}
    </NavLink>
  )
}

/**
 * Sidebar: thanh điều hướng bên trái gồm logo, các mục Dashboard / Sensors / History
 * và khối người dùng ở đáy: bấm vào đó mở menu Profile / Log out.
 */
export default function Sidebar() {
  const chuyenTrang = useNavigate()
  const nguoiDung = phien.layNguoiDung()

  // Menu mở ra khi bấm vào khối người dùng. `key` là đường dẫn của trang, riêng 'dangXuat' là đăng xuất.
  const menuNguoiDung = {
    items: [
      { key: DUONG_DAN.HO_SO, icon: <LuUser className="w-4 h-4" />, label: 'Profile' },
      { type: 'divider' },
      { key: 'dangXuat', icon: <LuLogOut className="w-4 h-4" />, label: 'Log out', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'dangXuat') {
        dichVuXacThuc.dangXuat()
        chuyenTrang(DUONG_DAN.DANG_NHAP, { replace: true })
      } else {
        chuyenTrang(key)
      }
    },
  }

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-outline h-screen flex flex-col px-4 pt-5 pb-4">
      {/* Logo: tên app và dòng chữ nhỏ bên dưới. */}
      <div className="px-2 pb-5 border-b border-outline">
        <p className="m-0 text-[1.0625rem] font-semibold text-text">VietFarm</p>
        <p className="m-0 mt-1 font-mono text-xs tracking-[0.12em] text-muted/80">IOT ARCHITECTURE</p>
      </div>

      <p className="mt-6 mb-3 px-4 font-mono text-xs tracking-[0.14em] text-muted">NAVIGATION</p>

      {/* Số 3 cạnh Sensors là số cảm biến của hệ thống (nhiệt độ, độ ẩm, ánh sáng). */}
      <nav className="flex flex-col gap-2">
        <NavItem to={DUONG_DAN.BANG_DIEU_KHIEN} icon={LuLayoutDashboard} end>
          Dashboard
        </NavItem>
        <NavItem to={DUONG_DAN.CAM_BIEN} icon={LuNetwork} badge={3}>
          Sensors
        </NavItem>
        <NavItem to={DUONG_DAN.LICH_SU} icon={LuScrollText}>
          History
        </NavItem>
      </nav>

      {/* Khối người dùng ở đáy: avatar chữ cái đầu, tên, mã đăng nhập và mũi tên mở menu. */}
      <div className="mt-auto pt-4 border-t border-outline">
        <Dropdown menu={menuNguoiDung} trigger={['click']} placement="topLeft">
          <button type="button" className="w-full flex items-center gap-3 p-2 rounded-lg bg-transparent border-0 cursor-pointer text-left hover:bg-canvas">
            <Avatar className="!bg-primary shrink-0" size={40}>
              {layChuCaiDau(nguoiDung?.fullName)}
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-text">{nguoiDung?.fullName}</span>
              <span className="block truncate font-mono text-xs text-muted">@{nguoiDung?.username}</span>
            </span>
            <LuChevronsUpDown className="w-4 h-4 shrink-0 text-muted" />
          </button>
        </Dropdown>
      </div>
    </aside>
  )
}
