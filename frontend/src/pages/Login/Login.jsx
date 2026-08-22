import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '@/components/common/Input/Input'
import Button from '@/components/common/Button/Button'
import { authService } from '@/services'
import { ROUTES } from '@/routes/paths'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await authService.login(form)
      navigate(ROUTES.DASHBOARD)
    } catch {
      setError('Invalid email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-6">
      <form
        className="w-full max-w-[380px] bg-white rounded-[14px] shadow-[6px_6px_54px_0_rgba(0,0,0,0.05)] px-9 py-10 flex flex-col gap-4 text-center"
        onSubmit={handleSubmit}
      >
        <p className="m-0 mb-2 text-[22px] font-extrabold text-text">
          <span className="text-primary">Viet</span>Farm
        </p>

        <h1 className="m-0 text-2xl font-bold text-text">Welcome back</h1>
        <p className="m-0 mb-2 text-sm text-text/60">Log in to monitor your farm sensors.</p>

        {error && <p className="m-0 px-3 py-2.5 rounded-lg bg-red/10 text-red text-[13px] text-left">{error}</p>}

        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
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

        <div className="flex items-center justify-between text-[13px]">
          <label className="inline-flex items-center gap-1.5 text-text/80">
            <input type="checkbox" />
            Remember me
          </label>
          <a href="#forgot-password" className="text-primary no-underline font-semibold">
            Forgot password?
          </a>
        </div>

        <Button type="submit" loading={submitting}>
          Login
        </Button>
      </form>
    </div>
  )
}
