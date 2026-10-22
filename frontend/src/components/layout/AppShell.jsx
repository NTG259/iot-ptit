import Sidebar from './Sidebar'
import { useStompStatus } from '@/contexts/StompContext'
import './AppShell.css'

/**
 * AppShell: khung chung của mọi trang sau khi đăng nhập: Sidebar bên trái, breadcrumb phía trên,
 * tiêu đề/phụ đề trang và nội dung. Trang luôn vừa khít màn hình; chỉ panel nào chủ động
 * (bảng, biểu đồ) mới giãn ra chiếm phần chiều cao còn lại.
 */
export default function AppShell({ breadcrumb, title, subtitle, children }) {
  const { stompConnected, windAlertActive } = useStompStatus()
  const alertStatus = !stompConnected ? 'disconnected' : windAlertActive ? 'alert' : 'normal'

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-shell__content">
        {breadcrumb && (
          <div className="app-shell__breadcrumb">
            <span className="app-shell__breadcrumb-root">SYSTEM</span>
            <span className="app-shell__breadcrumb-separator">/</span>
            <span className="app-shell__breadcrumb-page">{breadcrumb}</span>
            <div className="app-shell__breadcrumb-right">
              <div className={`app-shell__status app-shell__status--${alertStatus}`}>
                <span className="app-shell__status-dot" />
                <span className="app-shell__status-label">
                  {alertStatus === 'alert' ? 'DANGER' : alertStatus === 'disconnected' ? 'OFFLINE' : 'NORMAL'}
                </span>
              </div>
            </div>
          </div>
        )}

        <main className="app-shell__main">
          {title && (
            <div>
              <h1 className="app-shell__title">{title}</h1>
              {subtitle && <p className="app-shell__subtitle">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
