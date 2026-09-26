import { Navigate, Outlet } from 'react-router-dom'
import { getToken } from '@/services/session'
import { ROUTES } from './paths'

export default function RequireAuth() {
  return getToken() ? <Outlet /> : <Navigate to={ROUTES.LOGIN} replace />
}
