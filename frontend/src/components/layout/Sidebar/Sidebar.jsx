import { NavLink, useNavigate } from 'react-router-dom'
import { LuLayoutDashboard, LuNetwork, LuScrollText, LuLogOut } from 'react-icons/lu'
import { ROUTES } from '@/routes/paths'
import { authService, session } from '@/services'
import { initialsOf } from '@/utils/user'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LuLayoutDashboard, path: ROUTES.DASHBOARD, end: true },
  { key: 'sensors', label: 'Sensors', icon: LuNetwork, path: ROUTES.SENSORS },
  { key: 'history', label: 'History', icon: LuScrollText, path: ROUTES.HISTORY },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const user = session.getUser()

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
        {NAV_ITEMS.map(({ key, label, icon: Icon, path, end, badge }) => (
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
            {badge != null && (
              <span className="ml-auto px-2 py-0.5 rounded-full bg-canvas border border-outline tabular-nums text-xs text-muted">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 px-2 pt-5 border-t border-outline">
        <NavLink to={ROUTES.PROFILE} className="flex items-center gap-3 min-w-0 no-underline">
          <span className="grid place-items-center w-10 h-10 shrink-0 rounded-full bg-primary text-white text-sm font-semibold">
            {initialsOf(user?.fullName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-text">{user?.fullName}</span>
            <span className="block truncate tabular-nums text-xs text-muted">@{user?.username}</span>
          </span>
        </NavLink>
        <button type="button" onClick={logout} aria-label="Log out" className="ml-auto p-2 rounded-lg text-muted cursor-pointer hover:text-text hover:bg-canvas">
          <LuLogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  )
}
