import { NavLink, useNavigate } from 'react-router-dom'
import { Avatar } from 'antd'
import { LuLayoutDashboard, LuLogOut, LuNetwork, LuScrollText } from 'react-icons/lu'
import { ROUTES } from '@/routes/paths'
import { authService, session } from '@/services'
import { getInitials } from '@/utils/user'
import './Sidebar.css'

// Mục đang mở thì có nền xanh nhạt, mục khác thì trong suốt (xem Sidebar.css).
function getNavItemClass({ isActive }) {
  if (isActive) {
    return 'sidebar__nav-item sidebar__nav-item--active'
  }
  return 'sidebar__nav-item sidebar__nav-item--inactive'
}

// Một mục điều hướng: icon và chữ.
// `end` để mục Dashboard ("/") không sáng ở mọi trang.
function NavItem({ to, icon: Icon, end, children }) {
  return (
    <NavLink to={to} end={end} className={getNavItemClass}>
      <Icon size="1.25rem" />
      {children}
    </NavLink>
  )
}

/**
 * Sidebar: thanh điều hướng bên trái gồm logo, các mục Dashboard / Sensors / History
 * và khối người dùng ở đáy: bấm vào tên để mở trang Profile, bấm icon bên phải để đăng xuất.
 */
export default function Sidebar() {
  const navigate = useNavigate()
  const user = session.getUser()

  function handleLogout() {
    authService.logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <aside className="sidebar">
      {/* Logo: tên app. */}
      <div className="sidebar__logo">
        <p className="sidebar__logo-name">VietFarm</p>
      </div>

      <nav className="sidebar__nav">
        <NavItem to={ROUTES.DASHBOARD} icon={LuLayoutDashboard} end>
          Dashboard
        </NavItem>
        <NavItem to={ROUTES.SENSORS} icon={LuNetwork}>
          Sensors
        </NavItem>
        <NavItem to={ROUTES.HISTORY} icon={LuScrollText}>
          History
        </NavItem>
      </nav>

      {/* Khối người dùng ở đáy: bấm vào avatar và tên để mở Profile; icon bên phải để đăng xuất. */}
      <div className="sidebar__user">
        <NavLink to={ROUTES.PROFILE} className="sidebar__user-link">
          <Avatar className="sidebar__avatar" size={40}>
            {getInitials(user?.fullName)}
          </Avatar>
          <span className="sidebar__user-text">
            <span className="sidebar__user-name">{user?.fullName}</span>
            <span className="sidebar__user-username">@{user?.username}</span>
          </span>
        </NavLink>
        <button type="button" className="sidebar__logout-button" onClick={handleLogout} title="Log out" aria-label="Log out">
          <LuLogOut size="1.25rem" />
        </button>
      </div>
    </aside>
  )
}
