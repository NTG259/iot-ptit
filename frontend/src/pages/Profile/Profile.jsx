import { useState } from 'react'
import Input from '@/components/common/Input/Input'
import Button from '@/components/common/Button/Button'
import AppShell from '@/components/layout/AppShell/AppShell'
import { userService } from '@/services'

const INITIAL_PROFILE = {
  fullName: 'Nguyen Truong Giang',
  email: 'nguyen.truong.giang@vietfarm.io',
  phone: '+84 912 345 678',
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()
}

export default function Profile() {
  const [form, setForm] = useState(INITIAL_PROFILE)
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setStatus(null)

    try {
      await userService.updateProfile(form)
      setStatus({ type: 'success', message: 'Profile updated.' })
    } catch {
      setStatus({ type: 'error', message: 'Could not save changes. Try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell title="Profile">
      <div className="max-w-[520px] bg-white rounded-[14px] shadow-[6px_6px_54px_0_rgba(0,0,0,0.05)] p-8 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-[22px] font-bold shrink-0">
            {getInitials(form.fullName)}
          </div>
          <div>
            <p className="m-0 text-xl font-bold text-text">{form.fullName}</p>
            <p className="mt-1 text-[13px] text-text/60">Farm Owner</p>
          </div>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {status && (
            <p
              className={`m-0 px-3 py-2.5 rounded-lg text-[13px] ${
                status.type === 'success' ? 'bg-[rgba(52,199,89,0.12)] text-green' : 'bg-[rgba(255,59,48,0.1)] text-red'
              }`}
            >
              {status.message}
            </p>
          )}

          <Input id="fullName" name="fullName" label="Full name" value={form.fullName} onChange={handleChange} required />
          <Input id="email" name="email" type="email" label="Email" value={form.email} onChange={handleChange} required />
          <Input id="phone" name="phone" label="Phone number" value={form.phone} onChange={handleChange} />

          <Button type="submit" loading={submitting}>
            Save changes
          </Button>
        </form>
      </div>
    </AppShell>
  )
}
