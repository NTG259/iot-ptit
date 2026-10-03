import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
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
  const user = session.getUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [menuOpen])

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

      <div ref={menuRef} className="relative mt-auto flex items-center gap-3 px-2 pt-5 border-t border-outline">
        {menuOpen && (
          <div role="menu" className="absolute left-0 right-0 bottom-full mb-2 z-20 p-2 border border-outline rounded-xl bg-white shadow-lg">
            {USER_MENU_ITEMS.map(({ label, icon: Icon, path }) => (
              <NavLink
                key={path}
                to={path}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-[0.9375rem] no-underline ${
                    isActive ? 'bg-primary-soft text-primary font-semibold' : 'text-text hover:bg-canvas'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        )}
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex items-center gap-3 min-w-0 -m-1 p-1 rounded-lg text-left cursor-pointer hover:bg-canvas"
        >
          <span className="grid place-items-center w-10 h-10 shrink-0 rounded-full bg-primary text-white text-sm font-semibold">
            {initialsOf(user?.fullName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-text">{user?.fullName}</span>
            <span className="block truncate tabular-nums text-xs text-muted">@{user?.username}</span>
          </span>
        </button>
        <button type="button" onClick={logout} aria-label="Log out" className="ml-auto p-2 rounded-lg text-muted cursor-pointer hover:text-text hover:bg-canvas">
          <LuLogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  )
}
