import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import Sensors from '@/pages/Sensors'
import History from '@/pages/History'
import Profile from '@/pages/Profile'
import ThresholdConfig from '@/pages/ThresholdConfig'
import AlertChart from '@/pages/AlertChart'
import RequireAuth from './RequireAuth'
import { ROUTES } from './paths'

// Trang đăng nhập đứng riêng; các trang còn lại phải đăng nhập mới vào được.
const router = createBrowserRouter([
  { path: ROUTES.LOGIN, element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      { path: ROUTES.DASHBOARD,   element: <Dashboard /> },
      { path: ROUTES.SENSORS,     element: <Sensors /> },
      { path: ROUTES.HISTORY,     element: <History /> },
      { path: ROUTES.PROFILE,     element: <Profile /> },
      { path: ROUTES.THRESHOLDS,  element: <ThresholdConfig /> },
      { path: ROUTES.ALERTS,      element: <AlertChart /> },
    ],
  },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
