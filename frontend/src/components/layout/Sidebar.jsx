import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Button, Dropdown } from 'antd'
import { LuLayoutDashboard, LuNetwork, LuScrollText, LuLogOut, LuUser, LuSlidersHorizontal } from 'react-icons/lu'
import { ROUTES } from '@/routes/paths'
import { authService, session } from '@/services'
import { initialsOf } from '@/utils/user'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LuLayoutDashboard, path: ROUTES.DASHBOARD, end: true },
  { key: 'sensors', label: 'Sensors', icon: LuNetwork, path: ROUTES.SENSORS },
  { key: 'history', label: 'History', icon: LuScrollText, path: ROUTES.HISTORY },
]

const USER_MENU_ITEMS = [
  { label: 'Profile', icon: LuUser, path: ROUTES.PROFILE },
  { label: 'Sensor thresholds', icon: LuSlidersHorizontal, path: ROUTES.SETTINGS },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = session.getUser()

  const userMenu = {
    items: USER_MENU_ITEMS.map(({ label, icon: Icon, path }) => ({
      key: path,
      icon: <Icon className="w-4 h-4" />,
      label: <Link to={path}>{label}</Link>,
    })),
    selectedKeys: [pathname],
  }

  const logout = () => {
    authService.logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-outline h-screen flex flex-col px-4 pt-5 pb-4">
      <div className="flex items-center gap-4 px-2 pb-5 border-b border-outline">
        <div>
          <p className="m-0 text-[1.0625rem] font-semibold text-text">
            Lumen <span className="text-outline">/</span> Sense
          </p>
          <p className="m-0 mt-1 tabular-nums text-xs tracking-[0.12em] text-muted/80">IOT ARCHITECTURE</p>
        </div>
      </div>

      <p className="mt-6 mb-3 px-4 tabular-nums text-xs tracking-[0.14em] text-muted">NAVIGATION</p>

      <nav className="flex flex-col gap-2">
        {NAV_ITEMS.map(({ key, label, icon: Icon, path, end }) => (
          <NavLink
            key={key}
            to={path}
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
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-2 px-1 pt-5 border-t border-outline">
        <Dropdown menu={userMenu} trigger={['click']} placement="topLeft">
          <Button type="text" className="!h-auto !p-1 !justify-start min-w-0 flex-1 text-left">
            <Avatar className="!bg-primary shrink-0" size={40}>
              {initialsOf(user?.fullName)}
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-text">{user?.fullName}</span>
              <span className="block truncate tabular-nums text-xs text-muted">@{user?.username}</span>
            </span>
          </Button>
        </Dropdown>
        <Button type="text" onClick={logout} aria-label="Log out" icon={<LuLogOut className="w-5 h-5" />} className="!text-muted" />
      </div>
    </aside>
  )
}
