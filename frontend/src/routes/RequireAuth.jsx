import { Navigate, Outlet } from 'react-router-dom'
import { getToken } from '@/services/session'
import { ROUTES } from './paths'
import { StompProvider } from '@/contexts/StompContext'

// Chặn các trang cần đăng nhập: chưa có token thì chuyển về trang đăng nhập.
export default function RequireAuth() {
  if (getToken()) {
    return <StompProvider><Outlet /></StompProvider>
  }
  return <Navigate to={ROUTES.LOGIN} replace />
}
