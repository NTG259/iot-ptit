import { useState } from 'react'
import { LuCopy, LuCheck, LuGithub, LuFigma } from 'react-icons/lu'
import AppShell from '@/components/layout/AppShell'
import { session, userService } from '@/services'
import useApi from '@/hooks/useApi'
import { initialsOf } from '@/utils/user'

function CopyField({ label, value, valueClass = 'text-text' }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked (insecure origin, denied permission); the value stays selectable.
    }
  }

  return (
    <div className="flex items-center gap-5 px-4 py-3 border border-outline rounded-xl bg-canvas/60">
      <div className="min-w-0">
        <p className="m-0 tabular-nums text-sm tracking-[0.12em] uppercase text-slate-400">{label}</p>
        <p className={`m-0 mt-1 truncate text-base ${valueClass}`}>{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className={`ml-auto p-2 rounded-lg cursor-pointer hover:bg-white ${copied ? 'text-primary' : 'text-slate-400 hover:text-text'}`}
      >
        {copied ? <LuCheck className="w-5 h-5" /> : <LuCopy className="w-5 h-5" />}
      </button>
    </div>
  )
}

const LINK_CLASS =
  'flex items-center justify-center gap-2 h-11 rounded-lg border border-outline bg-canvas/60 text-base font-medium text-text no-underline hover:bg-white'

export default function Profile() {
  // Show the cached user immediately, then refresh from the API.
  const { data, error } = useApi(() => userService.getProfile(), [])
  const user = data ?? session.getUser() ?? {}

  return (
    <AppShell breadcrumb="User Profile">
      <div className="flex-1 grid place-items-center">
        <section className="panel w-full max-w-[38rem] px-8 py-6 shadow-lg">
          <div className="flex flex-col items-center text-center">
            <div className="relative grid place-items-center w-20 h-20 rounded-full bg-primary-soft border-2 border-primary-line text-3xl font-semibold text-primary">
              {initialsOf(user.fullName)}
            </div>
            <h1 className="m-0 mt-4 text-2xl font-semibold tracking-[-0.02em] text-text">{user.fullName}</h1>
            <p className="m-0 mt-2 text-lg text-slate-600">{user.role}</p>
            <p className="m-0 mt-2 flex items-center gap-2 text-muted">
              {user.school}
            </p>
          </div>

          <div className="my-5 border-t border-outline" />

          <div className="flex flex-col gap-4">
            <CopyField label="Mã sinh viên" value={user.studentId ?? '—'} valueClass="tabular-nums font-semibold text-primary" />
            <CopyField label="Email" value={user.email ?? '—'} />
          </div>

          {(user.githubUrl || user.figmaUrl) && (
            <div className="mt-5 grid grid-cols-2 gap-4">
              {user.githubUrl && (
                <a href={user.githubUrl} target="_blank" rel="noreferrer" className={LINK_CLASS}>
                  <LuGithub className="w-5 h-5" />
                  GitHub
                </a>
              )}
              {user.figmaUrl && (
                <a href={user.figmaUrl} target="_blank" rel="noreferrer" className={LINK_CLASS}>
                  <LuFigma className="w-5 h-5" />
                  Figma
                </a>
              )}
            </div>
          )}

          {error && <p className="m-0 mt-4 text-sm text-red">Could not refresh profile: {error.message}</p>}
        </section>
      </div>
    </AppShell>
  )
}
