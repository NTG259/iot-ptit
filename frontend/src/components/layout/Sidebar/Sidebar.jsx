import { NavLink, Link } from 'react-router-dom'
import { FiGrid, FiCpu, FiClock, FiUser, FiLogOut } from 'react-icons/fi'
import { ROUTES } from '@/routes/paths'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: FiGrid, path: ROUTES.DASHBOARD, end: true },
  { key: 'sensors', label: 'Sensors', icon: FiCpu, path: ROUTES.SENSORS },
  { key: 'history', label: 'History', icon: FiClock, path: ROUTES.HISTORY },
  { key: 'profile', label: 'Profile', icon: FiUser, path: ROUTES.PROFILE },
]

const NAV_ITEM_BASE = 'flex items-center gap-3 px-6 py-3.5 text-sm font-semibold tracking-[0.3px] text-text no-underline'

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-white border-r border-outline min-h-screen py-6 box-border">
      <p className="m-0 mb-8 px-6 text-xl font-extrabold text-text">
        <span className="text-primary">Viet</span>Farm
      </p>

      <nav className="flex flex-col">
        {NAV_ITEMS.map(({ key, label, icon: Icon, path, end }) =>
          path ? (
            <NavLink
              key={key}
              to={path}
              end={end}
              className={({ isActive }) => `${NAV_ITEM_BASE} ${isActive ? 'bg-primary text-white rounded-r-md mr-5' : ''}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </NavLink>
          ) : (
            <span key={key} className={`${NAV_ITEM_BASE} opacity-45 cursor-default`}>
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </span>
          ),
        )}
      </nav>

      <div className="border-t border-outline mx-6 my-3" />

      <Link to={ROUTES.LOGIN} className={NAV_ITEM_BASE}>
        <FiLogOut className="w-5 h-5 shrink-0" />
        Log out
      </Link>
    </aside>
  )
}
