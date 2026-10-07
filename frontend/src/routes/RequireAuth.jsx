import { Navigate, Outlet } from 'react-router-dom'
import { layToken } from '@/services/session'
import { DUONG_DAN } from './paths'

// Chặn các trang cần đăng nhập: chưa có token thì chuyển về trang đăng nhập.
export default function RequireAuth() {
  return layToken() ? <Outlet /> : <Navigate to={DUONG_DAN.DANG_NHAP} replace />
}
