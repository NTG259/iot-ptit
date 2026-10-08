import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Alert, Button, Form, Input } from 'antd'
import { authService, session } from '@/services'
import { ROUTES } from '@/routes/paths'
import './Login.css'

/**
 * Login: trang đăng nhập. Gửi username/password lên backend; thành công thì lưu phiên
 * vào localStorage rồi chuyển tới Dashboard.
 * Lỗi 401 hiện "Invalid username or password.", lỗi khác hiện nguyên thông báo từ API.
 * Nếu đã có token sẵn thì chuyển thẳng tới Dashboard.
 */
export default function Login() {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Gửi form đăng nhập; `values` là { username, password } do antd gom từ các ô nhập.
  async function handleSubmit(values) {
    setSubmitting(true)
    setErrorMessage(null)

    try {
      await authService.login(values)
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (error) {
      if (error.httpStatus === 401) {
        setErrorMessage('Invalid username or password.')
      } else {
        setErrorMessage(error.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (session.getToken()) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return (
    <div className="login">
      <Form
        layout="vertical"
        requiredMark={false}
        onFinish={handleSubmit}
        className="login__form"
      >
        <div className="login__header">
          <p className="login__brand">VietFarm</p>
          <h1 className="login__title">Welcome back</h1>
          <p className="login__subtitle">Log in to monitor your IoT sensors and devices.</p>
        </div>

        {errorMessage && <Alert type="error" showIcon title={errorMessage} className="login__error" />}

        <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Enter your username.' }]}>
          <Input placeholder="admin" autoComplete="username" size="large" />
        </Form.Item>

        <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password.' }]}>
          <Input.Password placeholder="••••••••" autoComplete="current-password" size="large" />
        </Form.Item>

        <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
          Login
        </Button>
      </Form>
    </div>
  )
}
