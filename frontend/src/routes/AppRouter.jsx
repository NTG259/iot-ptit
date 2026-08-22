import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard/Dashboard'
import Login from '@/pages/Login/Login'
import Sensors from '@/pages/Sensors/Sensors'
import History from '@/pages/History/History'
import Profile from '@/pages/Profile/Profile'
import { ROUTES } from './paths'

const router = createBrowserRouter([
  { path: ROUTES.DASHBOARD, element: <Dashboard /> },
  { path: ROUTES.LOGIN, element: <Login /> },
  { path: ROUTES.SENSORS, element: <Sensors /> },
  { path: ROUTES.HISTORY, element: <History /> },
  { path: ROUTES.PROFILE, element: <Profile /> },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
