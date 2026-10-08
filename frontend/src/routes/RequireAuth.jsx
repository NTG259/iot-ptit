import { Navigate, Outlet } from 'react-router-dom'
import { getToken } from '@/services/session'
import { ROUTES } from './paths'

// Chặn các trang cần đăng nhập: chưa có token thì chuyển về trang đăng nhập.
export default function RequireAuth() {
  if (getToken()) {
    return <Outlet />
  }
  return <Navigate to={ROUTES.LOGIN} replace />
}
