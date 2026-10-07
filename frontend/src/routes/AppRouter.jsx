import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import Sensors from '@/pages/Sensors'
import History from '@/pages/History'
import Profile from '@/pages/Profile'
import RequireAuth from './RequireAuth'
import { DUONG_DAN } from './paths'

// Trang đăng nhập đứng riêng; các trang còn lại phải đăng nhập mới vào được.
const boDinhTuyen = createBrowserRouter([
  { path: DUONG_DAN.DANG_NHAP, element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      { path: DUONG_DAN.BANG_DIEU_KHIEN, element: <Dashboard /> },
      { path: DUONG_DAN.CAM_BIEN, element: <Sensors /> },
      { path: DUONG_DAN.LICH_SU, element: <History /> },
      { path: DUONG_DAN.HO_SO, element: <Profile /> },
    ],
  },
])

export default function AppRouter() {
  return <RouterProvider router={boDinhTuyen} />
}
