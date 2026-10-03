import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Alert, Button, Checkbox, Form, Input } from 'antd'
import { authService, session } from '@/services'
import { ROUTES } from '@/routes/paths'

export default function Login() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(values) {
    setSubmitting(true)
    setError(null)

    try {
      await authService.login(values)
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (err) {
      setError(err.status === 401 ? 'Invalid username or password.' : err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (session.getToken()) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-6">
      <Form
        layout="vertical"
        requiredMark={false}
        initialValues={{ remember: true }}
        onFinish={handleSubmit}
        className="w-full max-w-[23.75rem] bg-white rounded-2xl shadow-[6px_6px_54px_0_rgba(0,0,0,0.05)] px-9 py-10"
      >
        <div className="mb-6 text-center">
          <p className="m-0 mb-4 text-[1.375rem] font-semibold text-text">
            Lumen <span className="text-outline">/</span> Sense
          </p>
          <h1 className="m-0 text-2xl font-bold text-text">Welcome back</h1>
          <p className="m-0 mt-1 text-sm text-text/60">Log in to monitor your IoT sensors and devices.</p>
        </div>

        {error && <Alert type="error" showIcon title={error} className="mb-4" />}

        <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Enter your username.' }]}>
          <Input placeholder="admin" autoComplete="username" size="large" />
        </Form.Item>

        <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password.' }]}>
          <Input.Password placeholder="••••••••" autoComplete="current-password" size="large" />
        </Form.Item>

        <Form.Item name="remember" valuePropName="checked">
          <Checkbox>Remember me</Checkbox>
        </Form.Item>

        <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
          Login
        </Button>
      </Form>
    </div>
  )
}
