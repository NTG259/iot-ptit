import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { authService, session } from '@/services'
import { ROUTES } from '@/routes/paths'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '', remember: true })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await authService.login(form)
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
      <form
        className="w-full max-w-[23.75rem] bg-white rounded-2xl shadow-[6px_6px_54px_0_rgba(0,0,0,0.05)] px-9 py-10 flex flex-col gap-4 text-center"
        onSubmit={handleSubmit}
      >
        <p className="m-0 mb-2 text-[1.375rem] font-semibold text-text">
          Lumen <span className="text-outline">/</span> Sense
        </p>

        <h1 className="m-0 text-2xl font-bold text-text">Welcome back</h1>
        <p className="m-0 mb-2 text-sm text-text/60">Log in to monitor your IoT sensors and devices.</p>

        {error && <p className="m-0 px-3 py-2.5 rounded-lg bg-red/10 text-red text-[0.8125rem] text-left">{error}</p>}

        <Input
          id="username"
          name="username"
          label="Username"
          placeholder="admin"
          value={form.username}
          onChange={handleChange}
          autoComplete="username"
          required
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
          required
        />

        <label className="inline-flex items-center gap-1.5 text-[0.8125rem] text-text/80">
          <input type="checkbox" name="remember" checked={form.remember} onChange={handleChange} />
          Remember me
        </label>

        <Button type="submit" loading={submitting}>
          Login
        </Button>
      </form>
    </div>
  )
}
