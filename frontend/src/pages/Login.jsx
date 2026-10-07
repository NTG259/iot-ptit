import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Alert, Button, Form, Input } from 'antd'
import { dichVuXacThuc, phien } from '@/services'
import { DUONG_DAN } from '@/routes/paths'

/**
 * Login: trang đăng nhập. Gửi username/password lên backend; thành công thì lưu phiên
 * vào localStorage rồi chuyển tới Dashboard.
 * Lỗi 401 hiện "Invalid username or password.", lỗi khác hiện nguyên thông báo từ API.
 * Nếu đã có token sẵn thì chuyển thẳng tới Dashboard.
 */
export default function Login() {
  const chuyenTrang = useNavigate()
  const [thongBaoLoi, datThongBaoLoi] = useState(null)
  const [dangGui, datDangGui] = useState(false)

  // Gửi form đăng nhập; `giaTri` là { username, password } do antd gom từ các ô nhập.
  async function xuLyGui(giaTri) {
    datDangGui(true)
    datThongBaoLoi(null)

    try {
      await dichVuXacThuc.dangNhap(giaTri)
      chuyenTrang(DUONG_DAN.BANG_DIEU_KHIEN, { replace: true })
    } catch (loiGoi) {
      datThongBaoLoi(loiGoi.maHttp === 401 ? 'Invalid username or password.' : loiGoi.message)
    } finally {
      datDangGui(false)
    }
  }

  if (phien.layToken()) {
    return <Navigate to={DUONG_DAN.BANG_DIEU_KHIEN} replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-6">
      <Form
        layout="vertical"
        requiredMark={false}
        onFinish={xuLyGui}
        className="w-full max-w-[23.75rem] bg-white rounded-2xl shadow-[6px_6px_54px_0_rgba(0,0,0,0.05)] px-9 py-10"
      >
        <div className="mb-6 text-center">
          <p className="m-0 mb-4 text-[1.375rem] font-semibold text-text">VietFarm</p>
          <h1 className="m-0 text-2xl font-bold text-text">Welcome back</h1>
          <p className="m-0 mt-1 text-sm text-text/60">Log in to monitor your IoT sensors and devices.</p>
        </div>

        {thongBaoLoi && <Alert type="error" showIcon title={thongBaoLoi} className="mb-4" />}

        <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Enter your username.' }]}>
          <Input placeholder="admin" autoComplete="username" size="large" />
        </Form.Item>

        <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password.' }]}>
          <Input.Password placeholder="••••••••" autoComplete="current-password" size="large" />
        </Form.Item>

        <Button type="primary" htmlType="submit" block size="large" loading={dangGui}>
          Login
        </Button>
      </Form>
    </div>
  )
}
